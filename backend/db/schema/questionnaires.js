// questionnaire_templates + vendor_questionnaires (RTV-48) — port of
// models/QuestionnaireTemplate.js + models/VendorQuestionnaire.js. questions[] /
// results are document-shaped → JSONB.
import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { questionnaireStatusEnum } from './enums.js';
import { workspaces } from './workspaces.js';
import { users } from './users.js';

export const questionnaireTemplates = pgTable(
  'questionnaire_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    version: text('version').notNull().default('1.0'),
    isDefault: boolean('is_default').notNull().default(false),
    // [{ id, text, doraArticle, category, hint }]
    questions: jsonb('questions').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('questionnaire_templates_is_default_idx').on(t.isDefault)]
);

export const vendorQuestionnaires = pgTable(
  'vendor_questionnaires',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').references(() => questionnaireTemplates.id, {
      onDelete: 'set null',
    }),
    vendorName: text('vendor_name').notNull(),
    vendorEmail: text('vendor_email').notNull(), // lowercase — repo layer
    vendorContactName: text('vendor_contact_name').notNull().default(''),
    token: text('token'), // public response token; unique when present
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    status: questionnaireStatusEnum('status').notNull().default('draft'),
    statusMessage: text('status_message').notNull().default(''),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    // [{ id, text, doraArticle, category, hint, answer, score, gapLevel, reasoning }]
    questions: jsonb('questions').notNull().default([]),
    overallScore: integer('overall_score'), // 0..100
    // { summary, domainsAnalyzed:[…], generatedAt }
    results: jsonb('results'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('vendor_questionnaires_ws_created_idx').on(t.workspaceId, t.createdAt.desc()),
    index('vendor_questionnaires_createdby_status_idx').on(t.createdBy, t.status),
    uniqueIndex('vendor_questionnaires_token_uniq')
      .on(t.token)
      .where(sql`${t.token} is not null`),
  ]
);
