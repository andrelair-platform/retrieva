import { AppError } from '../utils/index.js';
import { userRepository } from '../repositories/drizzle/UserRepository.js';
import { organizationRepository } from '../repositories/drizzle/OrganizationRepository.js';
import { organizationMemberRepository } from '../repositories/drizzle/OrganizationMemberRepository.js';
import {
  generateTokenPair,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateMfaToken,
  verifyMfaToken,
} from '../utils/security/jwt.js';
import { emailService } from './emailService.js';
import { authAuditService } from './authAuditService.js';
import { mfaService } from './mfaService.js';
import logger from '../config/logger.js';

const RESEND_VERIFICATION_COOLDOWN_MS = 60 * 1000;

// RTV-49: users now come from the Drizzle userRepository, which returns a SANITIZED
// row — `id` (uuid), `name` already decrypted, secrets stripped. No Mongoose documents.
function toUserPayload(user, overrides = {}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    mfaEnabled: !!user.mfaEnabled,
    organizationId: user.organizationId ? user.organizationId.toString() : null,
    onboardingCompleted: user.onboardingCompleted,
    onboardingChecklist: user.onboardingChecklist,
    ...overrides,
  };
}

class AuthService {
  constructor(deps = {}) {
    this.userRepo = deps.userRepo || userRepository;
    this.organizationRepo = deps.organizationRepo || organizationRepository;
    this.memberRepo = deps.memberRepo || organizationMemberRepository;
    this.emailService = deps.emailService || emailService;
    this.authAudit = deps.authAudit || authAuditService;
    this.mfa = deps.mfa || mfaService;
    this.logger = deps.logger || logger;
  }

  /** Resolve an organization summary for inclusion in /me + login responses. */
  async _resolveOrganizationSummary(organizationId) {
    if (!organizationId) return null;
    const org = await this.organizationRepo.findById(organizationId);
    if (!org) return null;
    return { id: org.id, name: org.name, industry: org.industry, country: org.country };
  }

  async register({ email, password, name, role, inviteToken, deviceInfo }) {
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      this.logger.warn('Registration attempt with existing email', { email });
      throw new AppError('Email already registered', 409);
    }

    // create() hashes the password + encrypts name at rest, returns a sanitized row.
    const user = await this.userRepo.create({ email, password, name, role: role || 'user' });

    const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });
    await this.userRepo.addRefreshToken(user.id, hashRefreshToken(tokens.refreshToken), deviceInfo);

    let organizationId = null;
    if (inviteToken) {
      try {
        const member = await this.memberRepo.findByToken(inviteToken);
        if (member && member.email === email.toLowerCase()) {
          await this.memberRepo.activate(member.id, user.id);
          await this.userRepo.setOrganization(user.id, member.organizationId);
          organizationId = member.organizationId;
        }
      } catch (err) {
        this.logger.warn('Invite token processing failed during registration', {
          userId: user.id,
          error: err.message,
        });
      }
    }

    const verificationToken = await this.userRepo.setEmailVerificationToken(user.id);
    this.emailService
      .sendEmailVerification({ toEmail: user.email, toName: name, verificationToken })
      .catch((err) => {
        this.logger.warn('Failed to send verification email', {
          userId: user.id,
          error: err.message,
        });
      });

    this.logger.info('New user registered', {
      userId: user.id,
      email: user.email,
      role: user.role,
      hasOrg: !!organizationId,
    });
    this.authAudit.logRegisterSuccess?.({ userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        name,
        role: user.role,
        isEmailVerified: false,
        organizationId: organizationId ? organizationId.toString() : null,
      },
      needsOrganization: !organizationId,
      tokens,
    };
  }

  /**
   * A3: notify a user out-of-band that all their sessions were revoked because a refresh
   * token was reused (a sign of theft). Best-effort; never throws into the auth flow.
   */
  _sendTokenTheftAlert(user) {
    try {
      const result = this.emailService.sendEmail?.({
        to: user.email,
        subject: 'Security alert: we signed you out of all devices',
        html:
          `<p>Hi ${user.name || 'there'},</p>` +
          `<p>We detected that an old sign-in token for your Retrieva account was ` +
          `reused, which can indicate it was stolen. As a precaution we revoked ` +
          `all active sessions.</p>` +
          `<p><strong>If this was you</strong> (e.g. an old tab or device), just ` +
          `sign in again.</p>` +
          `<p><strong>If this wasn't you</strong>, reset your password immediately ` +
          `and review your account.</p><p>— The Retrieva team</p>`,
      });
      result?.catch?.((err) =>
        this.logger.warn('Failed to send token-theft alert email', {
          userId: user.id,
          error: err.message,
        })
      );
    } catch (err) {
      this.logger.warn('Failed to send token-theft alert email', {
        userId: user.id,
        error: err.message,
      });
    }
  }

  async login({ email, password, deviceInfo }) {
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      this.logger.warn('Login attempt with non-existent email', { email });
      throw new AppError('Invalid credentials', 401);
    }

    if (user.isLocked) {
      this.logger.warn('Login attempt on locked account', {
        userId: user.id,
        lockUntil: user.lockUntil,
      });
      this.authAudit.logLoginBlockedLocked?.({ userId: user.id, email });
      throw new AppError('Account is temporarily locked. Please try again later.', 423);
    }

    if (!user.isActive) {
      this.logger.warn('Login attempt on inactive account', { userId: user.id });
      throw new AppError('Account is inactive', 401);
    }

    const isPasswordValid = await this.userRepo.verifyPassword(user.id, password);
    if (!isPasswordValid) {
      this.logger.warn('Failed login attempt', { email });
      const after = await this.userRepo.incLoginAttempts(user.id);
      this.authAudit.logLoginFailed?.({ userId: user.id, email });
      if (after?.isLocked) {
        this.authAudit.logAccountLocked?.({ userId: user.id, email });
      }
      throw new AppError('Invalid credentials', 401);
    }

    await this.userRepo.resetLoginAttempts(user.id);

    // A1: if MFA is enabled, password is only step 1 — return a short-lived challenge.
    if (user.mfaEnabled) {
      this.logger.info('Login passed password, MFA required', { userId: user.id });
      this.authAudit.logLoginSuccess?.({ userId: user.id, email: user.email, mfa: 'pending' });
      return { mfaRequired: true, mfaToken: generateMfaToken({ userId: user.id }) };
    }

    return this._issueSession(user, deviceInfo);
  }

  /** Issue tokens + a refresh session for an already-authenticated user. */
  async _issueSession(user, deviceInfo) {
    const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });
    await this.userRepo.addRefreshToken(user.id, hashRefreshToken(tokens.refreshToken), deviceInfo);

    const organization = await this._resolveOrganizationSummary(user.organizationId);

    this.logger.info('User logged in', { userId: user.id, email: user.email });
    this.authAudit.logLoginSuccess?.({ userId: user.id, email: user.email });

    return { user: toUserPayload(user, { organization }), tokens };
  }

  // ---------------------------------------------------------------------------
  // MFA (TOTP) — audit gap A1
  // ---------------------------------------------------------------------------

  /** Step 1: generate (but don't yet enable) a TOTP secret; return secret + otpauth URI. */
  async setupMfa(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.mfaEnabled) throw new AppError('MFA is already enabled', 409);

    const secret = this.mfa.generateSecret();
    await this.userRepo.setMfaSecret(userId, secret);

    return { secret, otpauthUrl: this.mfa.keyUri(user.email, secret) };
  }

  /** Step 2: verify the first code, enable MFA, return the one-time recovery codes. */
  async enableMfa(userId, token) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.mfaEnabled) throw new AppError('MFA is already enabled', 409);

    const secret = await this.userRepo.getMfaSecret(userId);
    if (!secret) throw new AppError('Start MFA setup first', 400);
    if (!this.mfa.verifyTotp(secret, token)) {
      throw new AppError('Invalid verification code', 400);
    }

    const { plain, hashed } = this.mfa.generateRecoveryCodes();
    await this.userRepo.enableMfa(userId, hashed);

    this.logger.info('MFA enabled', { userId });
    return { recoveryCodes: plain };
  }

  /** Step 2 of login: exchange a valid MFA challenge + TOTP/recovery code for a session. */
  async verifyMfa({ mfaToken, code, deviceInfo }) {
    let decoded;
    try {
      decoded = verifyMfaToken(mfaToken);
    } catch (error) {
      throw new AppError(error.message || 'Invalid MFA token', 401);
    }

    const user = await this.userRepo.findById(decoded.userId);
    if (!user || !user.mfaEnabled) {
      throw new AppError('MFA is not enabled for this account', 400);
    }
    if (!user.isActive) throw new AppError('Account is inactive', 401);

    if (!(await this._consumeMfaCode(user.id, code))) {
      this.authAudit.logLoginFailed?.({ userId: user.id, reason: 'mfa' });
      throw new AppError('Invalid verification code', 401);
    }

    return this._issueSession(user, deviceInfo);
  }

  /** Disable MFA. Requires current password AND a valid TOTP/recovery code. */
  async disableMfa(userId, { password, code }) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.mfaEnabled) throw new AppError('MFA is not enabled', 400);

    if (!(await this.userRepo.verifyPassword(userId, password))) {
      throw new AppError('Invalid password', 401);
    }
    if (!(await this._consumeMfaCode(userId, code))) {
      throw new AppError('Invalid verification code', 401);
    }

    await this.userRepo.disableMfa(userId);
    this.logger.info('MFA disabled', { userId });
    return { disabled: true };
  }

  /**
   * Verify a code against the user's TOTP secret, falling back to single-use recovery
   * codes (consumed in place). Returns true on success.
   */
  async _consumeMfaCode(userId, code) {
    const secret = await this.userRepo.getMfaSecret(userId);
    if (secret && this.mfa.verifyTotp(secret, code)) return true;

    const hash = this.mfa.hashRecoveryCode(code || '');
    const codes = await this.userRepo.getRecoveryCodes(userId);
    const idx = codes.indexOf(hash);
    if (idx === -1) return false;

    codes.splice(idx, 1); // consume
    await this.userRepo.setRecoveryCodes(userId, codes);
    return true;
  }

  /**
   * Result conventions:
   *   throws AppError 401 — caller should also clearAuthCookies(res)
   *   returns { accessToken, refreshToken } on success
   */
  async refreshTokens({ refreshTokenValue, deviceInfo }) {
    if (!refreshTokenValue) {
      throw new AppError('Refresh token required', 401);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshTokenValue);
    } catch (error) {
      this.logger.warn('Invalid refresh token signature', { error: error.message });
      throw new AppError(error.message || 'Invalid refresh token', 401);
    }

    const user = await this.userRepo.findById(decoded.userId);
    if (!user) {
      this.logger.warn('User not found for refresh token', { userId: decoded.userId });
      throw new AppError('Invalid refresh token', 401);
    }
    if (!user.isActive) {
      throw new AppError('Account is inactive', 401);
    }

    const tokenValid = await this.userRepo.consumeRefreshToken(
      user.id,
      hashRefreshToken(refreshTokenValue)
    );

    if (!tokenValid) {
      // Possible theft — clear all refresh tokens
      this.logger.warn('Refresh token not found or already used - possible token theft', {
        userId: user.id,
      });
      await this.userRepo.clearRefreshTokens(user.id);
      this.authAudit.logTokenTheftDetected?.({ userId: user.id });
      this._sendTokenTheftAlert(user);
      throw new AppError('Invalid refresh token. Please login again.', 401);
    }

    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken({ userId: user.id, email: user.email });
    await this.userRepo.addRefreshToken(user.id, hashRefreshToken(newRefreshToken), deviceInfo);
    await this.userRepo.updateLastLogin(user.id);

    this.logger.info('Tokens rotated successfully', { userId: user.id });
    this.authAudit.logTokenRefresh?.({ userId: user.id });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout({ userId, refreshTokenValue, logoutAll }) {
    const user = await this.userRepo.findById(userId);
    if (!user) return;

    if (logoutAll) {
      await this.userRepo.clearRefreshTokens(user.id);
      this.logger.info('User logged out from all devices', { userId: user.id });
      this.authAudit.logLogout?.({ userId: user.id, allDevices: true });
      return;
    }

    if (refreshTokenValue) {
      await this.userRepo.consumeRefreshToken(user.id, hashRefreshToken(refreshTokenValue));
    }
    this.logger.info('User logged out', { userId: user.id });
    this.authAudit.logLogout?.({ userId: user.id, allDevices: false });
  }

  async getMe(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const organization = await this._resolveOrganizationSummary(user.organizationId);

    return {
      user: toUserPayload(user, {
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        organization,
      }),
    };
  }

  async updateProfile(userId, { name, email }) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (!name && !email) {
      throw new AppError('No profile changes provided', 400);
    }
    if (email && email !== user.email) {
      throw new AppError('Email cannot be changed via profile update', 400);
    }

    const updated = name ? await this.userRepo.setName(userId, name) : user;

    this.logger.info('User profile updated', { userId });

    return {
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        isEmailVerified: updated.isEmailVerified,
        createdAt: updated.createdAt,
        lastLogin: updated.lastLogin,
      },
    };
  }

  async forgotPassword({ email }) {
    const user = await this.userRepo.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.info('Password reset requested for non-existent email', { email });
      return;
    }

    const resetToken = await this.userRepo.setPasswordResetToken(user.id);

    const emailResult = await this.emailService.sendPasswordResetEmail({
      toEmail: user.email,
      toName: user.name,
      resetToken,
    });

    if (!emailResult.success) {
      this.logger.error('Failed to send password reset email', {
        userId: user.id,
        error: emailResult.error || emailResult.reason,
        reason: emailResult.reason,
      });
      await this.userRepo.clearPasswordResetToken(user.id);
      throw new AppError(
        'Email service is temporarily unavailable. Please try again later or contact support.',
        503
      );
    }

    this.logger.info('Password reset email sent', { userId: user.id, email: user.email });
    this.authAudit.logPasswordResetRequest?.({ userId: user.id, email: user.email });
  }

  async resetPassword({ token, password }) {
    const found = await this.userRepo.findByValidPasswordResetToken(token);
    if (!found) {
      this.logger.warn('Invalid or expired password reset token');
      throw new AppError('Invalid or expired reset token. Please request a new one.', 400);
    }

    // setPassword revokes all sessions (force re-login on all devices).
    await this.userRepo.setPassword(found.safe.id, password, { revokeSessions: true });
    await this.userRepo.clearPasswordResetToken(found.safe.id);

    this.logger.info('Password reset successful', { userId: found.safe.id });
    this.authAudit.logPasswordResetSuccess?.({ userId: found.safe.id });
  }

  async verifyEmail({ token }) {
    const found = await this.userRepo.findByValidEmailVerificationToken(token);
    if (!found) {
      this.logger.warn('Invalid or expired email verification token');
      throw new AppError('Invalid or expired verification token. Please request a new one.', 400);
    }

    const verified = await this.userRepo.markEmailVerified(found.id);

    this.logger.info('Email verified successfully', { userId: verified.id, email: verified.email });
    this.authAudit.logEmailVerified?.({ userId: verified.id, email: verified.email });

    this.emailService
      .sendWelcomeEmail({ toEmail: verified.email, toName: verified.name })
      .catch((err) => {
        this.logger.warn('Failed to send welcome email after verification', {
          userId: verified.id,
          error: err.message,
        });
      });
  }

  async resendVerification(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (user.isEmailVerified) {
      throw new AppError('Email is already verified', 400);
    }

    if (user.emailVerificationLastSentAt) {
      const elapsedMs = Date.now() - new Date(user.emailVerificationLastSentAt).getTime();
      if (elapsedMs < RESEND_VERIFICATION_COOLDOWN_MS) {
        this.logger.warn('Resend verification blocked due to cooldown', { userId: user.id });
        const waitSeconds = Math.ceil((RESEND_VERIFICATION_COOLDOWN_MS - elapsedMs) / 1000);
        throw new AppError(
          `Please wait ${waitSeconds}s before requesting another verification email.`,
          429
        );
      }
    }

    const verificationToken = await this.userRepo.setEmailVerificationToken(user.id);

    const emailResult = await this.emailService.sendEmailVerification({
      toEmail: user.email,
      toName: user.name,
      verificationToken,
    });

    if (!emailResult.success) {
      this.logger.error('Failed to resend verification email', {
        userId: user.id,
        error: emailResult.error || emailResult.reason,
        reason: emailResult.reason,
      });
      throw new AppError(
        'Email service is temporarily unavailable. Please try again later or contact support.',
        503
      );
    }

    this.logger.info('Verification email resent', { userId: user.id, email: user.email });
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const isPasswordValid = await this.userRepo.verifyPassword(userId, currentPassword);
    if (!isPasswordValid) {
      this.logger.warn('Change password failed - incorrect current password', { userId });
      throw new AppError('Current password is incorrect', 401);
    }

    // setPassword revokes all sessions (force re-login on all devices).
    await this.userRepo.setPassword(userId, newPassword, { revokeSessions: true });

    this.logger.info('Password changed successfully - all sessions invalidated', { userId });
  }

  async updateOnboarding(userId, { completed, checklist }) {
    const allowed = [
      'vendorCreated',
      'assessmentCreated',
      'memberInvited',
      'monitoringSetup',
      'dismissed',
    ];
    const filteredChecklist =
      checklist && typeof checklist === 'object'
        ? Object.fromEntries(
            Object.entries(checklist).filter(([k]) => allowed.includes(k))
          )
        : undefined;

    if (completed === undefined && (!filteredChecklist || Object.keys(filteredChecklist).length === 0)) {
      throw new AppError('No valid fields to update', 400);
    }

    await this.userRepo.updateOnboarding(userId, { completed, checklist: filteredChecklist });
  }
}

export const authService = new AuthService();
export { AuthService };
