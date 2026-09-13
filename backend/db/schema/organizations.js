// organizations + organization_members (RTV-48) — port of models/Organization.js
// + models/OrganizationMember.js. organizations.owner_id ↔ users.id is a circular
// FK (users.organization_id points back) — resolved via Drizzle's lazy `() =>` refs.
import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import {
  orgIndustryEnum,
  orgPlanEnum,
  orgPlanStatusEnum,
  orgMemberRoleEnum,
  memberStatusEnum,
} from './enums.js';
import { users } from './users.js';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  industry: orgIndustryEnum('industry').notNull().default('other'),
  country: text('country').notNull().default(''),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: orgPlanEnum('plan').notNull().default('starter'),
  planStatus: orgPlanStatusEnum('plan_status').notNull().default('trialing'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    email: text('email').notNull(), // lowercase — enforced in the repo layer
    role: orgMemberRoleEnum('role').notNull().default('analyst'),
    status: memberStatusEnum('status').notNull().default('pending'),
    inviteTokenHash: text('invite_token_hash'),
    inviteTokenExpires: timestamp('invite_token_expires', { withTimezone: true }),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('org_members_org_email_uniq').on(t.organizationId, t.email),
    index('org_members_user_id_idx').on(t.userId),
  ]
);
