/**
 * RTV-48 schema proof — the generated migration applies on an empty Postgres, and the
 * ported tables enforce real relational integrity (FKs + enums), plus the relational
 * query API (Drizzle relations, the .populate() replacement) works.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { startPg, stopPg } from './pgSetup.js';
import { connectPg, disconnectPg, getDb } from '../../config/db.js';
import { runMigrations } from '../../db/migrate.js';
import {
  users,
  organizations,
  workspaces,
  conversations,
  messages,
} from '../../db/schema/index.js';

let db;

const mkUser = (over = {}) => ({
  email: `u-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
  password: 'bcrypt-hash-placeholder',
  name: 'Test User',
  ...over,
});

describe('Drizzle schema (RTV-48)', () => {
  beforeAll(async () => {
    await startPg();
    await connectPg();
    await runMigrations(); // applies db/migrations/0000_init_schema.sql on the empty DB
    db = getDb();
  });

  afterAll(async () => {
    await disconnectPg();
    await stopPg();
  });

  it('applied the migration — all 13 tables exist', async () => {
    const res = await db.execute(
      sql`select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`
    );
    // 13 domain tables + Drizzle's __drizzle_migrations bookkeeping table.
    expect(res.rows[0].n).toBeGreaterThanOrEqual(13);
  });

  it('CRUD across the core graph (user → org → workspace → conversation → message)', async () => {
    const [user] = await db.insert(users).values(mkUser()).returning();
    expect(user.id).toBeTruthy();
    expect(user.role).toBe('user'); // enum default
    expect(user.notificationPreferences.inApp.workspace_invitation).toBe(true); // jsonb default

    const [org] = await db
      .insert(organizations)
      .values({ name: 'Acme Insurance', ownerId: user.id, industry: 'insurance' })
      .returning();
    await db.update(users).set({ organizationId: org.id }).where(eq(users.id, user.id));

    const [ws] = await db
      .insert(workspaces)
      .values({ name: 'Vendor A', userId: user.id, organizationId: org.id })
      .returning();
    expect(ws.vendorStatus).toBe('under-review'); // enum default
    expect(ws.certifications).toEqual([]); // jsonb default

    const [conv] = await db
      .insert(conversations)
      .values({ userId: user.id, workspaceId: ws.id, title: 'Q about DORA' })
      .returning();
    await db.insert(messages).values([
      { conversationId: conv.id, role: 'user', content: 'encrypted-blob-1' },
      { conversationId: conv.id, role: 'assistant', content: 'encrypted-blob-2' },
    ]);

    const msgCount = await db.execute(
      sql`select count(*)::int as n from messages where conversation_id = ${conv.id}`
    );
    expect(msgCount.rows[0].n).toBe(2);
  });

  it('rejects a foreign-key violation (workspace with a non-existent owner)', async () => {
    const bogusUserId = '00000000-0000-0000-0000-000000000000';
    await expect(
      db.insert(workspaces).values({ name: 'Orphan', userId: bogusUserId })
    ).rejects.toThrow();
  });

  it('rejects an invalid enum value at the DB level', async () => {
    await expect(
      db.execute(
        sql`insert into users (email, password, name, role) values ('bad@example.com', 'h', 'n', 'superadmin')`
      )
    ).rejects.toThrow();
  });

  it('relational query API loads a conversation WITH its messages (populate replacement)', async () => {
    const [user] = await db.insert(users).values(mkUser()).returning();
    const [conv] = await db
      .insert(conversations)
      .values({ userId: user.id, title: 'rel-test' })
      .returning();
    await db.insert(messages).values({ conversationId: conv.id, role: 'user', content: 'x' });

    const loaded = await db.query.conversations.findFirst({
      where: eq(conversations.id, conv.id),
      with: { messages: true, user: true },
    });
    expect(loaded.messages).toHaveLength(1);
    expect(loaded.user.id).toBe(user.id);
  });

  it('enforces the partial-unique idempotency index on conversations', async () => {
    const [user] = await db.insert(users).values(mkUser()).returning();
    const [ws] = await db.insert(workspaces).values({ name: 'W', userId: user.id }).returning();
    const key = `idem-${Date.now()}`;
    await db
      .insert(conversations)
      .values({ userId: user.id, workspaceId: ws.id, idempotencyKey: key });
    await expect(
      db.insert(conversations).values({ userId: user.id, workspaceId: ws.id, idempotencyKey: key })
    ).rejects.toThrow();
    // Two NULL-key rows are allowed (partial index) — no throw.
    await db.insert(conversations).values({ userId: user.id, workspaceId: ws.id });
    await db.insert(conversations).values({ userId: user.id, workspaceId: ws.id });
  });
});
