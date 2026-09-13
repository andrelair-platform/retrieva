/**
 * RTV-49 pt4 — the 3 tenant-scoped Drizzle repos on real Postgres. Verifies tenant
 * scoping of the standard path AND the deliberate unscoped bypasses (Assessment
 * cross-workspace org queries; VendorQuestionnaire public token lookup), plus the JSONB
 * document mutations + compliance aggregation + conversation stats.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { startPg, stopPg } from './pgSetup.js';
import { connectPg, disconnectPg, getDb } from '../../config/db.js';
import { runMigrations } from '../../db/migrate.js';
import { withTenantContext } from '../../db/tenantContext.js';
import { ConversationRepository } from '../../repositories/drizzle/ConversationRepository.js';
import { AssessmentRepository } from '../../repositories/drizzle/AssessmentRepository.js';
import { VendorQuestionnaireRepository } from '../../repositories/drizzle/VendorQuestionnaireRepository.js';
import { users, organizations, workspaces, assessments } from '../../db/schema/index.js';

let db;
let convRepo;
let asmtRepo;
let vqRepo;
let userId;
let wsA;
let wsB;

const ctxA = (fn) => withTenantContext({ workspaceId: wsA.id, userId }, fn);
const ctxB = (fn) => withTenantContext({ workspaceId: wsB.id, userId }, fn);

describe('Tenant-scoped Drizzle repos (RTV-49 pt4)', () => {
  beforeAll(async () => {
    await startPg();
    await connectPg();
    await runMigrations();
    db = getDb();
    convRepo = new ConversationRepository({ db });
    asmtRepo = new AssessmentRepository({ db });
    vqRepo = new VendorQuestionnaireRepository({ db });
  });
  afterAll(async () => {
    await disconnectPg();
    await stopPg();
  });
  beforeEach(async () => {
    await db.execute(
      sql`truncate table assessments, vendor_questionnaires, conversations, workspaces, organizations, users restart identity cascade`
    );
    const [u] = await db
      .insert(users)
      .values({ email: `u-${Math.random().toString(36).slice(2)}@x.io`, password: 'h', name: 'n' })
      .returning();
    userId = u.id;
    await db.insert(organizations).values({ name: 'Org', ownerId: u.id });
    [wsA] = await db.insert(workspaces).values({ name: 'A', userId }).returning();
    [wsB] = await db.insert(workspaces).values({ name: 'B', userId }).returning();
  });

  // ── Conversation ────────────────────────────────────────────────────────────
  it('Conversation: create stamps workspace, reads are tenant-scoped', async () => {
    const c = await ctxA(() => convRepo.createConversation({ userId, title: 'in A' }));
    expect(c.workspaceId).toBe(wsA.id);
    await ctxB(() => convRepo.createConversation({ userId, title: 'in B' }));

    expect((await ctxA(() => convRepo.findByUser(userId))).map((x) => x.title)).toEqual(['in A']);
    expect(await ctxA(() => convRepo.countByUser(userId))).toBe(1);
  });

  it('Conversation: incrementMessageCount + getUserStats (scoped)', async () => {
    const c = await ctxA(() => convRepo.createConversation({ userId, title: 't' }));
    await ctxA(() => convRepo.incrementMessageCount(c.id, 3));
    const again = await ctxA(() => convRepo.incrementMessageCount(c.id));
    expect(again.messageCount).toBe(4);
    const stats = await ctxA(() => convRepo.getUserStats(userId));
    expect(stats.totalConversations).toBe(1);
    expect(stats.totalMessages).toBe(4);
  });

  // ── Assessment ──────────────────────────────────────────────────────────────
  it('Assessment: standard reads tenant-scoped; findByWorkspaces spans workspaces (unscoped)', async () => {
    await db.insert(assessments).values([
      { workspaceId: wsA.id, name: 'a1', vendorName: 'V', status: 'complete', createdBy: userId },
      { workspaceId: wsB.id, name: 'b1', vendorName: 'V', status: 'complete', createdBy: userId },
    ]);
    // scoped: from A you only see A's
    expect((await ctxA(() => asmtRepo.find())).map((a) => a.name)).toEqual(['a1']);
    // unscoped org query across both workspaces (no context needed)
    const org = await asmtRepo.findByWorkspaces([wsA.id, wsB.id]);
    expect(org.assessments.map((a) => a.name).sort()).toEqual(['a1', 'b1']);
    expect(org.pagination.total).toBe(2);
  });

  it('Assessment: markDocumentIndexed mutates the right JSONB element; completeAnalysis sets results', async () => {
    const a = await ctxA(() =>
      asmtRepo.create({
        name: 'a',
        vendorName: 'V',
        createdBy: userId,
        documents: [
          { fileName: 'x.pdf', fileType: 'pdf', status: 'uploading' },
          { fileName: 'y.pdf', fileType: 'pdf', status: 'uploading' },
        ],
      })
    );
    await ctxA(() => asmtRepo.markDocumentIndexed(a.id, 1, 'coll-123'));
    const after = await ctxA(() => asmtRepo.findById(a.id));
    expect(after.documents[0].status).toBe('uploading'); // untouched
    expect(after.documents[1].status).toBe('indexed');
    expect(after.documents[1].qdrantCollectionId).toBe('coll-123');

    await ctxA(() =>
      asmtRepo.completeAnalysis(a.id, {
        gaps: [],
        overallRisk: 'Low',
        summary: 's',
        domainsAnalyzed: ['x'],
      })
    );
    const done = await ctxA(() => asmtRepo.findById(a.id));
    expect(done.status).toBe('complete');
    expect(done.results.overallRisk).toBe('Low');
  });

  it('Assessment: getComplianceScore averages risk over a workspace', async () => {
    await db.insert(assessments).values([
      {
        workspaceId: wsA.id,
        name: 'a',
        vendorName: 'V',
        status: 'complete',
        framework: 'DORA',
        createdBy: userId,
        results: { overallRisk: 'Low' },
      },
      {
        workspaceId: wsA.id,
        name: 'b',
        vendorName: 'V',
        status: 'complete',
        framework: 'DORA',
        createdBy: userId,
        results: { overallRisk: 'Medium' },
      },
    ]);
    const score = await asmtRepo.getComplianceScore(wsA.id);
    expect(score.score).toBe(75); // (100 + 50) / 2
    expect(score.assessmentCount).toBe(2);
    expect(score.status).toBe('amber');
  });

  // ── VendorQuestionnaire ───────────────────────────────────────────────────────
  it('VendorQuestionnaire: findByToken is unscoped (public link) but CRUD is tenant-scoped', async () => {
    const vq = await ctxA(() =>
      vqRepo.create({ vendorName: 'V', vendorEmail: 'v@x.io', token: 'tok-abc', createdBy: userId })
    );
    expect(vq.workspaceId).toBe(wsA.id);
    // public token lookup works with NO tenant context
    const byToken = await vqRepo.findByToken('tok-abc');
    expect(byToken?.id).toBe(vq.id);
    // but scoped CRUD from another tenant can't see it
    expect(await ctxB(() => vqRepo.findById(vq.id))).toBeNull();
    expect((await ctxA(() => vqRepo.find())).map((x) => x.id)).toEqual([vq.id]);
  });
});
