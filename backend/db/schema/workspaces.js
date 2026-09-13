// workspaces + workspace_members (RTV-48) — port of models/Workspace.js +
// models/WorkspaceMember.js. A workspace is both a project space AND a vendor
// profile (DORA Art. 28). certifications/vendor_functions/alerts_sent_at/permissions
// are document-shaped → JSONB.
import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import {
  workspaceSyncStatusEnum,
  tierEnum,
  serviceTypeEnum,
  vendorStatusEnum,
  workspaceMemberRoleEnum,
  memberStatusEnum,
} from './enums.js';
import { users } from './users.js';
import { organizations } from './organizations.js';

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id), // owner
    syncStatus: workspaceSyncStatusEnum('sync_status').notNull().default('idle'),
    vendorTier: tierEnum('vendor_tier'), // nullable
    country: text('country').notNull().default(''),
    serviceType: serviceTypeEnum('service_type'), // nullable
    contractStart: timestamp('contract_start', { withTimezone: true }),
    contractEnd: timestamp('contract_end', { withTimezone: true }),
    nextReviewDate: timestamp('next_review_date', { withTimezone: true }),
    vendorStatus: vendorStatusEnum('vendor_status').notNull().default('under-review'),
    // [{ type, validUntil, status }]
    certifications: jsonb('certifications').notNull().default([]),
    // array of vendor-function tags (payment_processing, core_banking, …)
    vendorFunctions: jsonb('vendor_functions').notNull().default([]),
    exitStrategyDoc: text('exit_strategy_doc'),
    // Map<certType|alertKey, ISO date>
    alertsSentAt: jsonb('alerts_sent_at').notNull().default({}),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('workspaces_user_id_idx').on(t.userId),
    index('workspaces_organization_id_idx').on(t.organizationId),
    index('workspaces_user_name_idx').on(t.userId, t.name),
  ]
);

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: workspaceMemberRoleEnum('role').notNull().default('member'),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
    status: memberStatusEnum('status').notNull().default('active'),
    // { canQuery, canViewSources, canInvite }
    permissions: jsonb('permissions')
      .notNull()
      .default({ canQuery: true, canViewSources: true, canInvite: false }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('workspace_members_ws_user_uniq').on(t.workspaceId, t.userId),
    index('workspace_members_user_status_idx').on(t.userId, t.status),
  ]
);
