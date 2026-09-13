/**
 * RTV-49 security proof — the TenantScopedRepository enforces multi-tenant isolation
 * at the DB query level (the replacement for the Mongoose tenantIsolation plugin):
 * reads/updates/deletes are scoped to getCurrentTenantId(), create() stamps it, and a
 * missing tenant context fails closed.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { startPg, stopPg } from './pgSetup.js';
import { connectPg, disconnectPg, getDb } from '../../config/db.js';
import { runMigrations } from '../../db/migrate.js';
import { withTenantContext } from '../../db/tenantContext.js';
import { TenantScopedRepository } from '../../repositories/drizzle/TenantScopedRepository.js';
import { BaseDrizzleRepository } from '../../repositories/drizzle/BaseDrizzleRepository.js';
import { users, workspaces, conversations } from '../../db/schema/index.js';

let db;
let convRepo;
let userId;
let wsA;
let wsB;

describe('TenantScopedRepository isolation (RTV-49)', () => {
  beforeAll(async () => {
    await startPg();
    await connectPg();
    await runMigrations();
    db = getDb();
    convRepo = new TenantScopedRepository(conversations, { db });
  });

  afterAll(async () => {
    await disconnectPg();
    await stopPg();
  });

  beforeEach(async () => {
    await db.execute(sql`truncate table conversations, workspaces, users restart identity cascade`);
    const [u] = await db
      .insert(users)
      .values({ email: `u-${Math.random().toString(36).slice(2)}@x.io`, password: 'h', name: 'n' })
      .returning();
    userId = u.id;
    [wsA] = await db.insert(workspaces).values({ name: 'A', userId }).returning();
    [wsB] = await db.insert(workspaces).values({ name: 'B', userId }).returning();
    // One conversation in each tenant (workspace), inserted WITHOUT scoping.
    await db.insert(conversations).values([
      { userId, workspaceId: wsA.id, title: 'A-conv' },
      { userId, workspaceId: wsB.id, title: 'B-conv' },
    ]);
  });

  it('find() returns only the active tenant’s rows', async () => {
    const inA = await withTenantContext({ workspaceId: wsA.id, userId }, () => convRepo.find());
    expect(inA.map((c) => c.title)).toEqual(['A-conv']);

    const inB = await withTenantContext({ workspaceId: wsB.id, userId }, () => convRepo.find());
    expect(inB.map((c) => c.title)).toEqual(['B-conv']);
  });

  it('findById() of another tenant’s row returns null (isolation, not error)', async () => {
    const [bConv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.workspaceId, wsB.id));
    const seenFromA = await withTenantContext({ workspaceId: wsA.id, userId }, () =>
      convRepo.findById(bConv.id)
    );
    expect(seenFromA).toBeNull();
    const seenFromB = await withTenantContext({ workspaceId: wsB.id, userId }, () =>
      convRepo.findById(bConv.id)
    );
    expect(seenFromB?.id).toBe(bConv.id);
  });

  it('create() stamps the workspace_id from context', async () => {
    const created = await withTenantContext({ workspaceId: wsA.id, userId }, () =>
      convRepo.create({ userId, title: 'stamped' })
    );
    expect(created.workspaceId).toBe(wsA.id);
  });

  it('cannot delete another tenant’s row', async () => {
    const [bConv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.workspaceId, wsB.id));
    const deleted = await withTenantContext({ workspaceId: wsA.id, userId }, () =>
      convRepo.deleteById(bConv.id)
    );
    expect(deleted).toBeNull(); // scoped out → nothing deleted
    // B's row still exists
    const stillThere = await withTenantContext({ workspaceId: wsB.id, userId }, () =>
      convRepo.findById(bConv.id)
    );
    expect(stillThere?.id).toBe(bConv.id);
  });

  it('count() is tenant-scoped', async () => {
    const nA = await withTenantContext({ workspaceId: wsA.id, userId }, () => convRepo.count());
    expect(nA).toBe(1);
  });

  it('fails closed when there is no tenant context', async () => {
    await expect(convRepo.find()).rejects.toThrow(/tenant context required/i);
    await expect(convRepo.create({ userId, title: 'x' })).rejects.toThrow(
      /tenant context required/i
    );
  });

  it('the plain BaseDrizzleRepository is NOT tenant-scoped (users)', async () => {
    const userRepo = new BaseDrizzleRepository(users, { db });
    const all = await userRepo.find();
    expect(all.length).toBeGreaterThanOrEqual(1); // no tenant filter applied
  });
});
