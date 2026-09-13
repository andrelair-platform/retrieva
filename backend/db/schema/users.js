// users (RTV-48) — port of models/User.js.
// `name` + `mfa_secret` are encrypted at rest (app-layer, applied in the repository
// boundary at RTV-49); `password` is bcrypt. refresh_tokens / notification_preferences
// / onboarding_checklist / mfa_recovery_codes are document-shaped → JSONB.
import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums.js';
import { organizations } from './organizations.js';

// Mongoose defaults, preserved verbatim so behaviour is identical post-cutover.
const NOTIFICATION_PREFERENCES_DEFAULT = {
  inApp: {
    workspace_invitation: true,
    workspace_removed: true,
    permission_changed: true,
    member_joined: true,
    member_left: false,
    sync_completed: true,
    sync_failed: true,
    indexing_completed: false,
    indexing_failed: true,
    system_alert: true,
    token_limit_warning: true,
  },
  email: {
    workspace_invitation: true,
    workspace_removed: true,
    permission_changed: false,
    sync_failed: true,
    system_alert: true,
    token_limit_reached: true,
    weekly_digest: true,
  },
};

const ONBOARDING_CHECKLIST_DEFAULT = {
  vendorCreated: false,
  assessmentCreated: false,
  memberInvited: false,
  monitoringSetup: false,
  dismissed: false,
};

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(), // bcrypt; select:false enforced in the repo layer
    name: text('name').notNull(), // encrypted at rest
    role: userRoleEnum('role').notNull().default('user'),
    isActive: boolean('is_active').notNull().default(true),
    // [{ tokenHash, deviceInfo, createdAt, expiresAt }]
    refreshTokens: jsonb('refresh_tokens').notNull().default([]),
    lastLogin: timestamp('last_login', { withTimezone: true }),
    loginAttempts: integer('login_attempts').notNull().default(0),
    lockUntil: timestamp('lock_until', { withTimezone: true }),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    emailVerificationToken: text('email_verification_token'),
    emailVerificationExpires: timestamp('email_verification_expires', { withTimezone: true }),
    emailVerificationLastSentAt: timestamp('email_verification_last_sent_at', {
      withTimezone: true,
    }),
    passwordResetToken: text('password_reset_token'),
    passwordResetExpires: timestamp('password_reset_expires', { withTimezone: true }),
    notificationPreferences: jsonb('notification_preferences')
      .notNull()
      .default(NOTIFICATION_PREFERENCES_DEFAULT),
    // Circular ref with organizations.owner_id — nullable + set null on delete.
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    onboardingChecklist: jsonb('onboarding_checklist')
      .notNull()
      .default(ONBOARDING_CHECKLIST_DEFAULT),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    mfaSecret: text('mfa_secret'), // encrypted at rest; nullable
    mfaRecoveryCodes: jsonb('mfa_recovery_codes'), // array of one-way hashes; nullable
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('users_organization_id_idx').on(t.organizationId)]
);
