// provider_dependencies (RTV-48) — port of models/ProviderDependency.js.
// The nth-party subcontracting edge (DORA Art. 28(4)). The Mongoose embedded
// parent/child node objects are FLATTENED into columns so the RTV-50 recursive-CTE
// traversal can index + join on the canonical `name` (the chain key for external
// nodes + shared-substrate detection) rather than dig through JSONB.
import { pgTable, uuid, text, boolean, real, timestamp, index } from 'drizzle-orm/pg-core';
import { providerNodeKindEnum, providerSourceEnum, tierEnum } from './enums.js';
import { organizations } from './organizations.js';
import { workspaces } from './workspaces.js';
import { users } from './users.js';

export const providerDependencies = pgTable(
  'provider_dependencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // parent node (kind=workspace → workspaceId set; kind=external → name only)
    parentKind: providerNodeKindEnum('parent_kind').notNull(),
    parentWorkspaceId: uuid('parent_workspace_id').references(() => workspaces.id, {
      onDelete: 'cascade',
    }),
    parentName: text('parent_name').notNull(), // canonical join key
    parentTier: tierEnum('parent_tier'),

    // child node
    childKind: providerNodeKindEnum('child_kind').notNull(),
    childWorkspaceId: uuid('child_workspace_id').references(() => workspaces.id, {
      onDelete: 'cascade',
    }),
    childName: text('child_name').notNull(),
    childTier: tierEnum('child_tier'),

    relationship: text('relationship').notNull().default('sub_processes_via'),
    source: providerSourceEnum('source').notNull().default('manual'),
    confidence: real('confidence').notNull().default(1), // 0..1
    confirmed: boolean('confirmed').notNull().default(true),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('provider_deps_org_idx').on(t.organizationId),
    // Traversal edges for the recursive CTE (chain by canonical name within an org).
    index('provider_deps_org_parent_name_idx').on(t.organizationId, t.parentName),
    index('provider_deps_org_child_name_idx').on(t.organizationId, t.childName),
  ]
);
