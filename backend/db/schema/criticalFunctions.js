// critical_functions + critical_function_dependencies (RTV-48) — port of
// models/CriticalFunction.js. The Mongoose `dependsOn: [Workspace]` array becomes a
// real M2M join table (a function → the provider workspaces it relies on).
import { pgTable, uuid, text, timestamp, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import { criticalityEnum } from './enums.js';
import { organizations } from './organizations.js';
import { users } from './users.js';
import { workspaces } from './workspaces.js';

export const criticalFunctions = pgTable(
  'critical_functions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    criticality: criticalityEnum('criticality').notNull(),
    description: text('description').notNull().default(''),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('critical_functions_org_name_uniq').on(t.organizationId, t.name)]
);

// M2M: which provider workspaces a critical function depends on.
export const criticalFunctionDependencies = pgTable(
  'critical_function_dependencies',
  {
    criticalFunctionId: uuid('critical_function_id')
      .notNull()
      .references(() => criticalFunctions.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.criticalFunctionId, t.workspaceId] })]
);
