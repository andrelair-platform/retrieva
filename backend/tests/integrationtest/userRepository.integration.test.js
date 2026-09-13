/**
 * RTV-49 pt2 — Drizzle UserRepository auth-surface proof on real Postgres. Covers the
 * security-critical behaviours ported from the Mongoose User model: bcrypt, sanitize
 * (secrets stripped + name decrypted), login-attempt lockout, refresh-token rotation
 * (max 5 + consume/theft), reset/verify token lifecycle, MFA secret encryption.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { startPg, stopPg } from './pgSetup.js';
import { connectPg, disconnectPg, getDb } from '../../config/db.js';
import { runMigrations } from '../../db/migrate.js';
import { UserRepository } from '../../repositories/drizzle/UserRepository.js';
import { isEncrypted } from '../../utils/security/fieldEncryption.js';
import { users } from '../../db/schema/index.js';

let repo;
let db;

const mk = (over = {}) => ({
  email: `u-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
  password: 'CorrectHorse1!',
  name: 'Jane Doe',
  ...over,
});

describe('Drizzle UserRepository auth surface (RTV-49 pt2)', () => {
  beforeAll(async () => {
    await startPg();
    await connectPg();
    await runMigrations();
    db = getDb();
    repo = new UserRepository({ db });
  });
  afterAll(async () => {
    await disconnectPg();
    await stopPg();
  });
  beforeEach(async () => {
    await db.execute(sql`truncate table users restart identity cascade`);
  });

  it('create() hashes password, encrypts name at rest, returns sanitized', async () => {
    const u = await repo.create(mk());
    expect(u.password).toBeUndefined(); // secret stripped
    expect(u.refreshTokens).toBeUndefined();
    expect(u.name).toBe('Jane Doe'); // decrypted for the caller
    expect(u.role).toBe('user');
    // stored row: password is a bcrypt hash, name is encrypted at rest
    const [raw] = await db.select().from(users);
    expect(raw.password).toMatch(/^\$2[aby]\$/);
    expect(raw.password).not.toBe('CorrectHorse1!');
    expect(isEncrypted(raw.name)).toBe(true);
  });

  it('verifyPassword() true for correct, false for wrong', async () => {
    const u = await repo.create(mk());
    expect(await repo.verifyPassword(u.id, 'CorrectHorse1!')).toBe(true);
    expect(await repo.verifyPassword(u.id, 'nope')).toBe(false);
  });

  it('lockout after 5 attempts, then resetLoginAttempts clears it', async () => {
    const u = await repo.create(mk());
    let s;
    for (let i = 0; i < 4; i++) s = await repo.incLoginAttempts(u.id);
    expect(s.isLocked).toBe(false);
    s = await repo.incLoginAttempts(u.id); // 5th
    expect(s.isLocked).toBe(true);
    s = await repo.resetLoginAttempts(u.id);
    expect(s.isLocked).toBe(false);
    expect(s.lastLogin).toBeTruthy();
  });

  it('refresh tokens: rotation cap at 5, consume once, theft = second consume fails', async () => {
    const u = await repo.create(mk());
    for (let i = 0; i < 7; i++) await repo.addRefreshToken(u.id, `hash-${i}`, 'dev');
    const [raw] = await db.select().from(users);
    expect(raw.refreshTokens).toHaveLength(5); // oldest evicted
    // the two oldest (hash-0, hash-1) were evicted; hash-2 survives
    expect(await repo.consumeRefreshToken(u.id, 'hash-2')).toBe(true);
    expect(await repo.consumeRefreshToken(u.id, 'hash-2')).toBe(false); // already used
    await repo.clearRefreshTokens(u.id);
    const [after] = await db.select().from(users);
    expect(after.refreshTokens).toEqual([]);
  });

  it('password reset token: set → find-by-valid → clear', async () => {
    const u = await repo.create(mk());
    const raw = await repo.setPasswordResetToken(u.id);
    expect(raw).toHaveLength(64); // 32 bytes hex
    const found = await repo.findByValidPasswordResetToken(raw);
    expect(found?.safe.id).toBe(u.id);
    expect(await repo.findByValidPasswordResetToken('wrong-token')).toBeNull();
    await repo.clearPasswordResetToken(u.id);
    expect(await repo.findByValidPasswordResetToken(raw)).toBeNull();
  });

  it('email verification: set → find → mark verified', async () => {
    const u = await repo.create(mk());
    const raw = await repo.setEmailVerificationToken(u.id);
    const found = await repo.findByValidEmailVerificationToken(raw);
    expect(found?.id).toBe(u.id);
    const verified = await repo.markEmailVerified(u.id);
    expect(verified.isEmailVerified).toBe(true);
    expect(await repo.findByValidEmailVerificationToken(raw)).toBeNull(); // consumed
  });

  it('MFA: secret encrypted at rest but round-trips; enable/disable', async () => {
    const u = await repo.create(mk());
    await repo.setMfaSecret(u.id, 'JBSWY3DPEHPK3PXP');
    const [raw] = await db.select().from(users);
    expect(isEncrypted(raw.mfaSecret)).toBe(true);
    expect(await repo.getMfaSecret(u.id)).toBe('JBSWY3DPEHPK3PXP');
    const enabled = await repo.enableMfa(u.id, ['h1', 'h2']);
    expect(enabled.mfaEnabled).toBe(true);
    expect(await repo.getRecoveryCodes(u.id)).toEqual(['h1', 'h2']);
    const disabled = await repo.disableMfa(u.id);
    expect(disabled.mfaEnabled).toBe(false);
    expect(await repo.getMfaSecret(u.id)).toBeNull();
  });

  it('onboarding checklist merge', async () => {
    const u = await repo.create(mk());
    const r = await repo.markAssessmentCreated(u.id);
    expect(r.onboardingChecklist.assessmentCreated).toBe(true);
    expect(r.onboardingChecklist.vendorCreated).toBe(false); // preserved default
    const r2 = await repo.updateOnboarding(u.id, {
      completed: true,
      checklist: { dismissed: true },
    });
    expect(r2.onboardingCompleted).toBe(true);
    expect(r2.onboardingChecklist.dismissed).toBe(true);
    expect(r2.onboardingChecklist.assessmentCreated).toBe(true); // prior merge kept
  });
});
