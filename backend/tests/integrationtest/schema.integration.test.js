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
  providerNodes,
  providerDependencies,
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

  it('applied the migration — all 14 tables exist', async () => {
    const res = await db.execute(
      sql`select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`
    );
    // 14 domain tables + Drizzle's __drizzle_migrations bookkeeping table.
    expect(res.rows[0].n).toBeGreaterThanOrEqual(14);
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

  it('rejects an out-of-set value on a text+CHECK taxonomy column (industry)', async () => {
    const [user] = await db.insert(users).values(mkUser()).returning();
    await expect(
      db.insert(organizations).values({ name: 'Bad Co', ownerId: user.id, industry: 'aerospace' })
    ).rejects.toThrow();
  });

  it('provider graph: nodes are unique per org, edges reference node ids, shared substrate is detectable', async () => {
    const [user] = await db.insert(users).values(mkUser()).returning();
    const [org] = await db
      .insert(organizations)
      .values({ name: 'Graph Org', ownerId: user.id })
      .returning();

    // Two vendors (v1, v2) both sub-process via the same external substrate (Azure).
    const [v1] = await db
      .insert(providerNodes)
      .values({
        organizationId: org.id,
        kind: 'external',
        canonicalName: 'vendor-1',
        displayName: 'Vendor 1',
      })
      .returning();
    const [v2] = await db
      .insert(providerNodes)
      .values({
        organizationId: org.id,
        kind: 'external',
        canonicalName: 'vendor-2',
        displayName: 'Vendor 2',
      })
      .returning();
    const [azure] = await db
      .insert(providerNodes)
      .values({
        organizationId: org.id,
        kind: 'external',
        canonicalName: 'azure',
        displayName: 'Azure',
      })
      .returning();

    // canonical_name is unique per org.
    await expect(
      db
        .insert(providerNodes)
        .values({
          organizationId: org.id,
          kind: 'external',
          canonicalName: 'azure',
          displayName: 'Azure (dup)',
        })
    ).rejects.toThrow();

    await db.insert(providerDependencies).values([
      { organizationId: org.id, parentNodeId: v1.id, childNodeId: azure.id },
      { organizationId: org.id, parentNodeId: v2.id, childNodeId: azure.id },
    ]);

    // Edge must reference a real node (FK integrity).
    await expect(
      db.insert(providerDependencies).values({
        organizationId: org.id,
        parentNodeId: v1.id,
        childNodeId: '00000000-0000-0000-0000-000000000000',
      })
    ).rejects.toThrow();

    // Shared substrate = a child node reached by >1 parent — a plain GROUP BY.
    const shared = await db.execute(
      sql`select child_node_id, count(*)::int as fanin from provider_dependencies where organization_id = ${org.id} group by child_node_id having count(*) > 1`
    );
    expect(shared.rows).toHaveLength(1);
    expect(shared.rows[0].child_node_id).toBe(azure.id);
    expect(shared.rows[0].fanin).toBe(2);
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
