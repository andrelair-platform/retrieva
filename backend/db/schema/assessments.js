// assessments (RTV-48) — port of models/Assessment.js. documents[] / results /
// risk_decision / clause_signoffs[] are document-shaped (nested regulatory payloads) → JSONB.
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { assessmentFrameworkEnum, assessmentStatusEnum } from './enums.js';
import { workspaces } from './workspaces.js';
import { users } from './users.js';

export const assessments = pgTable(
  'assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    vendorName: text('vendor_name').notNull(),
    framework: assessmentFrameworkEnum('framework').notNull().default('DORA'),
    status: assessmentStatusEnum('status').notNull().default('pending'),
    statusMessage: text('status_message').notNull().default(''),
    // [{ fileName, fileType, fileSize, category, qdrantCollectionId, uploadedAt, status, storageKey }]
    documents: jsonb('documents').notNull().default([]),
    // { gaps:[…], overallRisk, summary, generatedAt, domainsAnalyzed:[…] }
    results: jsonb('results'),
    reportPath: text('report_path'),
    // { decision, setBy, setByName, rationale, setAt } | null
    riskDecision: jsonb('risk_decision'),
    // [{ clauseRef, status, signedBy, signedByName, note, signedAt }]
    clauseSignoffs: jsonb('clause_signoffs').notNull().default([]),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('assessments_ws_created_idx').on(t.workspaceId, t.createdAt.desc()),
    index('assessments_createdby_status_idx').on(t.createdBy, t.status),
  ]
);
