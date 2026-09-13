/**
 * RTV-49 pt3 — the 6 non-tenant Drizzle repos on real Postgres. Focuses on the
 * non-trivial logic: OrganizationMember invite-token lifecycle (+ upsert), Workspace
 * JSONB certification queries, Message content encryption + countByRole aggregation,
 * WorkspaceMember membership lookups.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { startPg, stopPg } from './pgSetup.js';
import { connectPg, disconnectPg, getDb } from '../../config/db.js';
import { runMigrations } from '../../db/migrate.js';
import { users, organizations, workspaces, conversations } from '../../db/schema/index.js';
import { OrganizationMemberRepository } from '../../repositories/drizzle/OrganizationMemberRepository.js';
import { WorkspaceMemberRepository } from '../../repositories/drizzle/WorkspaceMemberRepository.js';
import { WorkspaceRepository } from '../../repositories/drizzle/WorkspaceRepository.js';
import { MessageRepository } from '../../repositories/drizzle/MessageRepository.js';
import { isEncrypted } from '../../utils/security/fieldEncryption.js';

let db;
let orgRepo;
let wsMemberRepo;
let wsRepo;
let msgRepo;
let userId;
let orgId;

describe('Drizzle non-tenant repos (RTV-49 pt3)', () => {
  beforeAll(async () => {
    await startPg();
    await connectPg();
    await runMigrations();
    db = getDb();
    orgRepo = new OrganizationMemberRepository({ db });
    wsMemberRepo = new WorkspaceMemberRepository({ db });
    wsRepo = new WorkspaceRepository({ db });
    msgRepo = new MessageRepository({ db });
  });
  afterAll(async () => {
    await disconnectPg();
    await stopPg();
  });
  beforeEach(async () => {
    await db.execute(
      sql`truncate table messages, conversations, workspace_members, organization_members, workspaces, organizations, users restart identity cascade`
    );
    const [u] = await db
      .insert(users)
      .values({ email: `u-${Math.random().toString(36).slice(2)}@x.io`, password: 'h', name: 'n' })
      .returning();
    userId = u.id;
    const [o] = await db.insert(organizations).values({ name: 'Org', ownerId: u.id }).returning();
    orgId = o.id;
  });

  it('OrganizationMember invite: create → findByToken → activate; upsert refreshes', async () => {
    const { member, rawToken } = await orgRepo.createInvite(
      orgId,
      'Invitee@X.io',
      'analyst',
      userId
    );
    expect(member.status).toBe('pending');
    expect(member.email).toBe('invitee@x.io'); // lowercased
    expect(rawToken).toHaveLength(64);

    const found = await orgRepo.findByToken(rawToken);
    expect(found?.id).toBe(member.id);
    expect(await orgRepo.findByToken('bogus')).toBeNull();

    // re-invite same email → upsert (no duplicate, new token)
    const again = await orgRepo.createInvite(orgId, 'invitee@x.io', 'viewer', userId);
    expect(again.member.id).toBe(member.id);
    expect(again.member.role).toBe('viewer');
    const [{ n }] = await db
      .execute(
        sql`select count(*)::int as n from organization_members where organization_id = ${orgId}`
      )
      .then((r) => r.rows);
    expect(n).toBe(1);

    const activated = await orgRepo.activate(member.id, userId);
    expect(activated.status).toBe('active');
    expect(activated.userId).toBe(userId);
    expect(activated.inviteTokenHash).toBeNull();
    // old token no longer valid (status active, hash cleared)
    expect(await orgRepo.findByToken(again.rawToken)).toBeNull();
  });

  it('countAdmins uses the org_admin enum value', async () => {
    await orgRepo.createInvite(orgId, 'a@x.io', 'org_admin', userId);
    await orgRepo.createInvite(orgId, 'b@x.io', 'analyst', userId);
    // activate the admin so status=active
    const admin = await orgRepo
      .findByOrganization(orgId, 'pending')
      .then((m) => m.find((x) => x.email === 'a@x.io'));
    await orgRepo.activate(admin.id, userId);
    expect(await orgRepo.countAdmins(orgId)).toBe(1);
  });

  it('Workspace JSONB certification queries', async () => {
    const soon = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
    const far = new Date(Date.now() + 400 * 24 * 3600 * 1000).toISOString();
    await db.insert(workspaces).values([
      { name: 'no-certs', userId, organizationId: orgId },
      {
        name: 'expiring',
        userId,
        organizationId: orgId,
        certifications: [{ type: 'ISO27001', validUntil: soon, status: 'valid' }],
      },
      {
        name: 'far',
        userId,
        organizationId: orgId,
        certifications: [{ type: 'SOC2', validUntil: far, status: 'valid' }],
      },
    ]);
    const withCerts = await wsRepo.findWithCertifications();
    expect(withCerts.map((w) => w.name).sort()).toEqual(['expiring', 'far']);

    const threshold = new Date(Date.now() + 90 * 24 * 3600 * 1000);
    const expiring = await wsRepo.findWithExpiringCertifications(threshold);
    expect(expiring.map((w) => w.name)).toEqual(['expiring']);

    const byOrg = await wsRepo.findByOrganization(orgId);
    expect(byOrg).toHaveLength(3);
  });

  it('WorkspaceMember membership lookups', async () => {
    const [ws] = await db.insert(workspaces).values({ name: 'W', userId }).returning();
    await wsMemberRepo.create({ workspaceId: ws.id, userId, role: 'owner', status: 'active' });
    expect((await wsMemberRepo.findMembership(ws.id, userId))?.role).toBe('owner');
    expect(await wsMemberRepo.findActiveByUserId(userId)).toHaveLength(1);
    expect(await wsMemberRepo.findByWorkspace(ws.id)).toHaveLength(1);
    await wsMemberRepo.deleteByWorkspace(ws.id);
    expect(await wsMemberRepo.findByWorkspace(ws.id)).toHaveLength(0);
  });

  it('Message: content encrypted at rest, decrypted on read, countByRole', async () => {
    const [conv] = await db.insert(conversations).values({ userId, title: 't' }).returning();
    await msgRepo.addMessagePair(conv.id, 'hello', 'hi there');
    await msgRepo.addUserMessage(conv.id, 'second question');

    const stored = await db.execute(
      sql`select content from messages where conversation_id = ${conv.id} limit 1`
    );
    expect(isEncrypted(stored.rows[0].content)).toBe(true); // at rest

    const history = await msgRepo.getChatHistory(conv.id);
    expect(history[0]).toEqual({ role: 'user', content: 'hello' }); // decrypted, oldest-first
    expect(history).toHaveLength(3);

    const counts = await msgRepo.countByRole(conv.id);
    expect(counts).toEqual({ user: 2, assistant: 1 });

    expect((await msgRepo.getLastMessage(conv.id)).content).toBe('second question');
    const found = await msgRepo.searchInConversation(conv.id, 'THERE');
    expect(found.map((m) => m.content)).toEqual(['hi there']);
  });
});
