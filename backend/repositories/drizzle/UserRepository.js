/**
 * Drizzle UserRepository (RTV-49 pt2) — reproduces the Mongoose User model's instance
 * methods (bcrypt, login-lockout, refresh-token rotation, reset/verify tokens, MFA,
 * field encryption) as row-based repository methods. The auth domain lives here now,
 * not on a document. Additive — AuthService is rewired onto this in a later increment.
 *
 * Reads return a SANITIZED row (secrets stripped, `name` decrypted, `isLocked` derived);
 * internal helpers (`_rawById`) read the full row for the auth logic.
 */
import bcrypt from 'bcryptjs';
import { eq, and, sql } from 'drizzle-orm';
import { BaseDrizzleRepository } from './BaseDrizzleRepository.js';
import { users } from '../../db/schema/index.js';
import { safeEncrypt, safeDecrypt } from '../../utils/security/fieldEncryption.js';
import { sha256, generateToken } from '../../utils/security/crypto.js';

const BCRYPT_ROUNDS = 12;
const MAX_SESSIONS = 5; // active refresh tokens per user
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MS = 2 * 60 * 60 * 1000; // 2h account lock
const REFRESH_TTL_DAYS = 7;
const RESET_TTL_MS = 60 * 60 * 1000; // 1h
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Never returned to callers by default (mirrors the model's select:false fields).
const SECRET_KEYS = [
  'password',
  'refreshTokens',
  'mfaSecret',
  'mfaRecoveryCodes',
  'emailVerificationToken',
  'emailVerificationExpires',
  'passwordResetToken',
  'passwordResetExpires',
];

export class UserRepository extends BaseDrizzleRepository {
  constructor(opts = {}) {
    super(users, opts);
  }

  isLocked(row) {
    return !!(row?.lockUntil && new Date(row.lockUntil).getTime() > Date.now());
  }

  /** Strip secrets + decrypt `name` + derive `isLocked` for safe return. */
  _sanitize(row) {
    if (!row) return null;
    const out = { ...row };
    for (const k of SECRET_KEYS) delete out[k];
    out.name = safeDecrypt(row.name);
    out.isLocked = this.isLocked(row);
    return out;
  }

  async _rawById(id) {
    return super.findById(id);
  }

  async _rawByEmail(email) {
    return super.findOne(eq(users.email, String(email).toLowerCase()));
  }

  async _hashPassword(plain) {
    return bcrypt.hash(plain, await bcrypt.genSalt(BCRYPT_ROUNDS));
  }

  // ── account lifecycle ──────────────────────────────────────────────────────
  async create({ email, password, name, role = 'user' }) {
    const row = await super.create({
      email: String(email).toLowerCase(),
      password: await this._hashPassword(password),
      name: safeEncrypt(name),
      role,
    });
    return this._sanitize(row);
  }

  async findById(id) {
    return this._sanitize(await this._rawById(id));
  }

  async findByEmail(email) {
    return this._sanitize(await this._rawByEmail(email));
  }

  async setOrganization(userId, organizationId) {
    return this._sanitize(await super.updateById(userId, { organizationId }));
  }

  // ── password ───────────────────────────────────────────────────────────────
  async verifyPassword(userId, candidate) {
    const row = await this._rawById(userId);
    if (!row) return false;
    return bcrypt.compare(candidate, row.password);
  }

  /** Set a new password; revokes all sessions by default (force re-login). */
  async setPassword(userId, newPassword, { revokeSessions = true } = {}) {
    const patch = { password: await this._hashPassword(newPassword) };
    if (revokeSessions) patch.refreshTokens = [];
    return this._sanitize(await super.updateById(userId, patch));
  }

  /** Update the display name (re-encrypted at rest). */
  async setName(userId, name) {
    return this._sanitize(await super.updateById(userId, { name: safeEncrypt(name) }));
  }

  // ── login attempts / lockout ────────────────────────────────────────────────
  async incLoginAttempts(userId) {
    const row = await this._rawById(userId);
    if (!row) return null;
    let attempts;
    let lockUntil;
    if (row.lockUntil && new Date(row.lockUntil).getTime() < Date.now()) {
      attempts = 1; // expired lock → start fresh
      lockUntil = null;
    } else {
      attempts = (row.loginAttempts || 0) + 1;
      lockUntil = row.lockUntil ?? null;
      if (attempts >= MAX_LOGIN_ATTEMPTS && !this.isLocked(row)) {
        lockUntil = new Date(Date.now() + LOCK_MS);
      }
    }
    return this._sanitize(await super.updateById(userId, { loginAttempts: attempts, lockUntil }));
  }

  async resetLoginAttempts(userId) {
    return this._sanitize(
      await super.updateById(userId, { loginAttempts: 0, lockUntil: null, lastLogin: new Date() })
    );
  }

  async updateLastLogin(userId) {
    return this._sanitize(await super.updateById(userId, { lastLogin: new Date() }));
  }

  // ── refresh tokens (jsonb array of {tokenHash,deviceInfo,createdAt,expiresAt}) ─
  async addRefreshToken(userId, tokenHash, deviceInfo = 'unknown', expiryDays = REFRESH_TTL_DAYS) {
    const row = await this._rawById(userId);
    if (!row) return;
    const tokens = (row.refreshTokens || []).filter((t) => new Date(t.expiresAt) > new Date());
    if (tokens.length >= MAX_SESSIONS) {
      tokens.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      tokens.shift(); // evict oldest
    }
    tokens.push({
      tokenHash,
      deviceInfo,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
    });
    await super.updateById(userId, { refreshTokens: tokens });
  }

  /** Consume (rotate) a refresh token. @returns {boolean} whether it was valid. */
  async consumeRefreshToken(userId, tokenHash) {
    const row = await this._rawById(userId);
    if (!row) return false;
    const tokens = row.refreshTokens || [];
    const idx = tokens.findIndex(
      (t) => t.tokenHash === tokenHash && new Date(t.expiresAt) > new Date()
    );
    if (idx === -1) return false;
    tokens.splice(idx, 1);
    await super.updateById(userId, { refreshTokens: tokens });
    return true;
  }

  async clearRefreshTokens(userId) {
    await super.updateById(userId, { refreshTokens: [] });
  }

  // ── password reset ───────────────────────────────────────────────────────────
  async setPasswordResetToken(userId) {
    const raw = generateToken(32);
    await super.updateById(userId, {
      passwordResetToken: sha256(raw),
      passwordResetExpires: new Date(Date.now() + RESET_TTL_MS),
    });
    return raw;
  }

  /** @returns {{raw, safe}|null} the raw row (for mutation) + a sanitized copy. */
  async findByValidPasswordResetToken(rawToken) {
    const row = await super.findOne(
      and(
        eq(users.passwordResetToken, sha256(rawToken)),
        sql`${users.passwordResetExpires} > now()`
      )
    );
    return row ? { raw: row, safe: this._sanitize(row) } : null;
  }

  async clearPasswordResetToken(userId) {
    await super.updateById(userId, { passwordResetToken: null, passwordResetExpires: null });
  }

  // ── email verification ───────────────────────────────────────────────────────
  async setEmailVerificationToken(userId) {
    const raw = generateToken(32);
    await super.updateById(userId, {
      emailVerificationToken: sha256(raw),
      emailVerificationExpires: new Date(Date.now() + VERIFY_TTL_MS),
      emailVerificationLastSentAt: new Date(),
    });
    return raw;
  }

  async findByValidEmailVerificationToken(rawToken) {
    return super.findOne(
      and(
        eq(users.emailVerificationToken, sha256(rawToken)),
        sql`${users.emailVerificationExpires} > now()`
      )
    );
  }

  async markEmailVerified(userId) {
    return this._sanitize(
      await super.updateById(userId, {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      })
    );
  }

  // ── MFA (TOTP) — secret + recovery codes encrypted/stored ────────────────────
  async setMfaSecret(userId, secret) {
    await super.updateById(userId, { mfaSecret: safeEncrypt(secret) });
  }

  async getMfaSecret(userId) {
    const row = await this._rawById(userId);
    return row?.mfaSecret ? safeDecrypt(row.mfaSecret) : null;
  }

  async enableMfa(userId, hashedRecoveryCodes) {
    return this._sanitize(
      await super.updateById(userId, { mfaEnabled: true, mfaRecoveryCodes: hashedRecoveryCodes })
    );
  }

  async disableMfa(userId) {
    return this._sanitize(
      await super.updateById(userId, {
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: null,
      })
    );
  }

  async getRecoveryCodes(userId) {
    const row = await this._rawById(userId);
    return row?.mfaRecoveryCodes || [];
  }

  async setRecoveryCodes(userId, codes) {
    await super.updateById(userId, { mfaRecoveryCodes: codes });
  }

  // ── onboarding ───────────────────────────────────────────────────────────────
  async markAssessmentCreated(userId) {
    const row = await this._rawById(userId);
    if (!row) return null;
    const checklist = { ...(row.onboardingChecklist || {}), assessmentCreated: true };
    return this._sanitize(await super.updateById(userId, { onboardingChecklist: checklist }));
  }

  async updateOnboarding(userId, { completed, checklist } = {}) {
    const row = await this._rawById(userId);
    if (!row) return null;
    const patch = {};
    if (completed !== undefined) patch.onboardingCompleted = completed;
    if (checklist && typeof checklist === 'object') {
      patch.onboardingChecklist = { ...(row.onboardingChecklist || {}), ...checklist };
    }
    if (Object.keys(patch).length === 0) return this._sanitize(row);
    return this._sanitize(await super.updateById(userId, patch));
  }
}

export const userRepository = new UserRepository();
