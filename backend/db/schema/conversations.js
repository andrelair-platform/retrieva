// conversations + messages (RTV-48) — port of models/Conversation.js + models/Message.js.
// message.content is encrypted at rest (app-layer). metadata.idempotencyKey is flattened
// to a column so the partial-unique idempotency index works relationally.
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { messageRoleEnum } from './enums.js';
import { users } from './users.js';
import { workspaces } from './workspaces.js';

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull().default('New Conversation'),
    // Was a loose String ('anonymous'); now a nullable FK — auth is required so the
    // legacy anonymous path maps to NULL (RTV-49 mapping).
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    messageCount: integer('message_count').notNull().default(0),
    idempotencyKey: text('idempotency_key'), // was metadata.idempotencyKey
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('conversations_user_updated_idx').on(t.userId, t.updatedAt.desc()),
    index('conversations_ws_user_updated_idx').on(t.workspaceId, t.userId, t.updatedAt.desc()),
    // Idempotency: one conversation per (user, workspace, key) — only when key is set.
    uniqueIndex('conversations_idempotency_uniq')
      .on(t.userId, t.workspaceId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
  ]
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(), // encrypted at rest
    // [{ id, title, content, url, pageId, score, section, type }]
    sources: jsonb('sources').notNull().default([]),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('messages_conversation_timestamp_idx').on(t.conversationId, t.timestamp)]
);
