// provider_nodes + provider_dependencies (RTV-48) — the nth-party subcontracting
// graph (DORA Art. 28(4)), the substrate for RTV-50 concentration traversal.
//
// Modelled as a first-class adjacency-list graph (NOT the Mongoose embedded-node shape):
//  - provider_nodes = the node identity space, deduped per org by canonical_name. A node
//    is either an assessed workspace (kind=workspace, workspace_id set) or an external
//    sub-provider (kind=external, name only, e.g. "OpenAI" → "Azure").
//  - provider_dependencies = directed parent→child EDGES referencing node ids.
//
// Why this over denormalised parent_*/child_* columns: node identity is explicit (a real
// provider appears ONCE), so shared-substrate detection ("4 vendors all on the same Azure")
// is a correct `GROUP BY child_node_id` instead of fragile string-name matching; the
// recursive CTE (RTV-50) traverses indexed uuid edges; node attributes (tier) live in one place.
import {
  pgTable,
  uuid,
  text,
  boolean,
  real,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { providerNodeKindEnum, providerSourceEnum, tierEnum } from './enums.js';
import { organizations } from './organizations.js';
import { workspaces } from './workspaces.js';
import { users } from './users.js';

export const providerNodes = pgTable(
  'provider_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    kind: providerNodeKindEnum('kind').notNull(),
    // set when kind = 'workspace' (the assessed vendor this node represents)
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    // normalised identity key (lowercase/trim at the repo layer) — dedup + join key
    canonicalName: text('canonical_name').notNull(),
    displayName: text('display_name').notNull(),
    tier: tierEnum('tier'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // A provider is ONE node per org — this is what makes shared-substrate detection correct.
    uniqueIndex('provider_nodes_org_canonical_uniq').on(t.organizationId, t.canonicalName),
    index('provider_nodes_org_idx').on(t.organizationId),
    index('provider_nodes_workspace_idx').on(t.workspaceId),
  ]
);

export const providerDependencies = pgTable(
  'provider_dependencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    parentNodeId: uuid('parent_node_id')
      .notNull()
      .references(() => providerNodes.id, { onDelete: 'cascade' }),
    childNodeId: uuid('child_node_id')
      .notNull()
      .references(() => providerNodes.id, { onDelete: 'cascade' }),
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
    // No duplicate edges of the same relationship between the same two nodes.
    uniqueIndex('provider_deps_edge_uniq').on(t.parentNodeId, t.childNodeId, t.relationship),
    index('provider_deps_org_idx').on(t.organizationId),
    index('provider_deps_parent_idx').on(t.parentNodeId),
    index('provider_deps_child_idx').on(t.childNodeId),
  ]
);
