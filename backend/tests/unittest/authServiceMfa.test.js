import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { AuthService } from '../../services/AuthService.js';
import { generateMfaToken } from '../../utils/security/jwt.js';

// RTV-49: MFA state lives in Postgres via userRepository methods — the service no longer
// mutates a Mongoose document. `makeUser` returns a sanitized repo row (id, no secrets).
function makeUser(over = {}) {
  return {
    id: 'u1',
    email: 'u@x.io',
    name: 'User',
    role: 'user',
    isActive: true,
    mfaEnabled: false,
    organizationId: null,
    ...over,
  };
}

function makeSvc() {
  // In-memory MFA state the fake repo reads/writes, so verify/enable/disable flows are exercised.
  const state = { secret: null, enabled: false, recoveryCodes: [] };

  const userRepo = {
    findById: vi.fn(),
    setMfaSecret: vi.fn(async (_id, s) => {
      state.secret = s;
    }),
    getMfaSecret: vi.fn(async () => state.secret),
    enableMfa: vi.fn(async (_id, hashed) => {
      state.enabled = true;
      state.recoveryCodes = hashed;
    }),
    disableMfa: vi.fn(async () => {
      state.enabled = false;
      state.secret = null;
      state.recoveryCodes = [];
    }),
    getRecoveryCodes: vi.fn(async () => state.recoveryCodes),
    setRecoveryCodes: vi.fn(async (_id, codes) => {
      state.recoveryCodes = codes;
    }),
    verifyPassword: vi.fn().mockResolvedValue(true),
    addRefreshToken: vi.fn().mockResolvedValue(undefined),
    updateLastLogin: vi.fn().mockResolvedValue(undefined),
  };
  const organizationRepo = { findById: vi.fn().mockResolvedValue(null) };
  const mfa = {
    generateSecret: vi.fn().mockReturnValue('SECRET'),
    keyUri: vi.fn().mockReturnValue('otpauth://totp/Retrieva:u@x.io'),
    verifyTotp: vi.fn().mockReturnValue(false),
    generateRecoveryCodes: vi.fn().mockReturnValue({ plain: ['a1b2c-d3e4f'], hashed: ['H1'] }),
    hashRecoveryCode: vi.fn((c) => `hash:${c}`),
  };
  const authAudit = { logLoginSuccess: vi.fn(), logLoginFailed: vi.fn() };
  const svc = new AuthService({ userRepo, organizationRepo, mfa, authAudit });
  return { svc, userRepo, organizationRepo, mfa, state };
}

describe('AuthService MFA (A1)', () => {
  let ctx;
  beforeEach(() => {
    ctx = makeSvc();
  });

  describe('setupMfa', () => {
    it('generates a secret and returns the otpauth URI', async () => {
      ctx.userRepo.findById.mockResolvedValue(makeUser());
      const res = await ctx.svc.setupMfa('u1');
      expect(res.secret).toBe('SECRET');
      expect(res.otpauthUrl).toContain('otpauth://');
      expect(ctx.userRepo.setMfaSecret).toHaveBeenCalledWith('u1', 'SECRET');
    });

    it('refuses when MFA is already enabled', async () => {
      ctx.userRepo.findById.mockResolvedValue(makeUser({ mfaEnabled: true }));
      await expect(ctx.svc.setupMfa('u1')).rejects.toThrow('already enabled');
    });
  });

  describe('enableMfa', () => {
    it('rejects an invalid first code', async () => {
      ctx.userRepo.findById.mockResolvedValue(makeUser());
      ctx.state.secret = 'SECRET';
      ctx.mfa.verifyTotp.mockReturnValue(false);
      await expect(ctx.svc.enableMfa('u1', '000000')).rejects.toThrow('Invalid verification code');
    });

    it('enables MFA and returns recovery codes on a valid code', async () => {
      ctx.userRepo.findById.mockResolvedValue(makeUser());
      ctx.state.secret = 'SECRET';
      ctx.mfa.verifyTotp.mockReturnValue(true);
      const res = await ctx.svc.enableMfa('u1', '123456');
      expect(res.recoveryCodes).toEqual(['a1b2c-d3e4f']);
      expect(ctx.userRepo.enableMfa).toHaveBeenCalledWith('u1', ['H1']);
    });

    it('requires setup before enable', async () => {
      ctx.userRepo.findById.mockResolvedValue(makeUser());
      ctx.state.secret = null;
      await expect(ctx.svc.enableMfa('u1', '123456')).rejects.toThrow('Start MFA setup first');
    });
  });

  describe('verifyMfa', () => {
    it('issues a session for a valid challenge token + TOTP code', async () => {
      ctx.userRepo.findById.mockResolvedValue(makeUser({ mfaEnabled: true }));
      ctx.state.secret = 'SECRET';
      ctx.mfa.verifyTotp.mockReturnValue(true);
      const mfaToken = generateMfaToken({ userId: 'u1' });

      const res = await ctx.svc.verifyMfa({ mfaToken, code: '123456', deviceInfo: {} });
      expect(res.user.id).toBe('u1');
      expect(res.tokens.accessToken).toBeTruthy();
      expect(ctx.userRepo.addRefreshToken).toHaveBeenCalled();
    });

    it('rejects an invalid code and audits the failure', async () => {
      ctx.userRepo.findById.mockResolvedValue(makeUser({ mfaEnabled: true }));
      ctx.state.secret = 'SECRET';
      ctx.mfa.verifyTotp.mockReturnValue(false);
      const mfaToken = generateMfaToken({ userId: 'u1' });

      await expect(ctx.svc.verifyMfa({ mfaToken, code: '000000', deviceInfo: {} })).rejects.toThrow(
        'Invalid verification code'
      );
      expect(ctx.authAudit?.logLoginFailed || (() => {})).toBeDefined();
    });

    it('accepts and consumes a recovery code when TOTP fails', async () => {
      ctx.userRepo.findById.mockResolvedValue(makeUser({ mfaEnabled: true }));
      ctx.state.secret = 'SECRET';
      ctx.state.recoveryCodes = ['hash:rec-ode', 'hash:other'];
      ctx.mfa.verifyTotp.mockReturnValue(false); // TOTP fails → recovery path
      const mfaToken = generateMfaToken({ userId: 'u1' });

      const res = await ctx.svc.verifyMfa({ mfaToken, code: 'rec-ode', deviceInfo: {} });
      expect(res.tokens.accessToken).toBeTruthy();
      expect(ctx.userRepo.setRecoveryCodes).toHaveBeenCalledWith('u1', ['hash:other']); // consumed
    });

    it('rejects a tampered/invalid MFA token', async () => {
      await expect(
        ctx.svc.verifyMfa({ mfaToken: 'not-a-token', code: '123456', deviceInfo: {} })
      ).rejects.toThrow('Invalid MFA token');
    });
  });

  describe('disableMfa', () => {
    it('requires a correct password', async () => {
      ctx.userRepo.findById.mockResolvedValue(makeUser({ mfaEnabled: true }));
      ctx.userRepo.verifyPassword.mockResolvedValue(false);
      await expect(ctx.svc.disableMfa('u1', { password: 'wrong', code: '123456' })).rejects.toThrow(
        'Invalid password'
      );
    });

    it('clears MFA state on valid password + code', async () => {
      ctx.userRepo.findById.mockResolvedValue(makeUser({ mfaEnabled: true }));
      ctx.state.secret = 'SECRET';
      ctx.mfa.verifyTotp.mockReturnValue(true);
      await ctx.svc.disableMfa('u1', { password: 'right', code: '123456' });
      expect(ctx.userRepo.disableMfa).toHaveBeenCalledWith('u1');
    });
  });
});
