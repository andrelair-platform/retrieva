/**
 * Drizzle AssessmentRepository (RTV-49 pt4). Tenant-scoped (workspaceId) for the generic
 * CRUD + per-assessment document/result mutations (scoped by tenant+id → no cross-tenant
 * writes). Methods that take an EXPLICIT workspace (findByWorkspaces / findLatestByWorkspace
 * / getComplianceScore) are deliberately UNSCOPED org-level queries — faithful to the old
 * plugin, which only added the workspace filter "if not already present". Additive; not wired.
 */
import { and, eq, inArray, gte, sql, desc } from 'drizzle-orm';
import { TenantScopedRepository } from './TenantScopedRepository.js';
import { assessments } from '../../db/schema/index.js';

export class AssessmentRepository extends TenantScopedRepository {
  constructor(opts = {}) {
    super(assessments, { tenantKey: 'workspaceId', ...opts });
  }

  // ── explicit cross-workspace / org-level queries (UNSCOPED by design) ────────
  /** Paginated assessments across several workspaces (org view). Excludes results.gaps. */
  async findByWorkspaces(workspaceIds, options = {}) {
    const ids = (workspaceIds || []).map(String);
    const conds = [inArray(assessments.workspaceId, ids)];
    if (options.status) conds.push(eq(assessments.status, options.status));
    if (options.workspaceId) conds.push(eq(assessments.workspaceId, options.workspaceId));
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 20;
    const where = and(...conds);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(assessments)
        .where(where)
        .orderBy(desc(assessments.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ total: sql`count(*)::int` })
        .from(assessments)
        .where(where),
    ]);
    // strip results.gaps (parity with the old .select('-results.gaps'))
    const stripped = rows.map((r) => {
      if (r.results && typeof r.results === 'object') {
        const { gaps, ...rest } = r.results;
        void gaps;
        return { ...r, results: rest };
      }
      return r;
    });
    return {
      assessments: stripped,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findLatestByWorkspace(workspaceId, withinMs) {
    const conds = [eq(assessments.workspaceId, workspaceId), eq(assessments.status, 'complete')];
    if (withinMs) conds.push(gte(assessments.createdAt, new Date(Date.now() - withinMs)));
    const [row] = await this.db
      .select()
      .from(assessments)
      .where(and(...conds))
      .orderBy(desc(assessments.createdAt))
      .limit(1);
    return row ?? null;
  }

  async getComplianceScore(workspaceId) {
    const riskMap = { Low: 100, Medium: 50, High: 0 };
    const rows = await this.db
      .select({ results: assessments.results, createdAt: assessments.createdAt })
      .from(assessments)
      .where(
        and(
          eq(assessments.workspaceId, workspaceId),
          eq(assessments.status, 'complete'),
          eq(assessments.framework, 'DORA')
        )
      )
      .orderBy(desc(assessments.createdAt));
    if (!rows.length) return null;

    const scoreOf = (a) => riskMap[a.results?.overallRisk] ?? 50;
    const score = Math.round(rows.reduce((s, a) => s + scoreOf(a), 0) / rows.length);

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const older = rows.filter((a) => new Date(a.createdAt) < cutoff);
    let trend = 0;
    if (older.length) {
      const oldScore = Math.round(older.reduce((s, a) => s + scoreOf(a), 0) / older.length);
      trend = score - oldScore;
    }
    return {
      score,
      trend,
      status: score >= 80 ? 'green' : score >= 60 ? 'amber' : 'red',
      assessmentCount: rows.length,
    };
  }

  // ── per-assessment mutations (tenant+id scoped) ──────────────────────────────
  /** Set documents[docIndex].status (+ optional extra top-level fields). */
  async markDocumentStatus(id, docIndex, status, extra = {}) {
    const [row] = await this.updateWhere(eq(assessments.id, id), {
      documents: sql`jsonb_set(${assessments.documents}, array[${String(docIndex)}, 'status'], to_jsonb(${status}::text))`,
      ...extra,
    });
    return row ?? null;
  }

  /** Set documents[docIndex].status = 'indexed' + .qdrantCollectionId = collectionName. */
  async markDocumentIndexed(id, docIndex, collectionName) {
    const idx = String(docIndex);
    const [row] = await this.updateWhere(eq(assessments.id, id), {
      documents: sql`jsonb_set(
        jsonb_set(${assessments.documents}, array[${idx}, 'status'], to_jsonb('indexed'::text)),
        array[${idx}, 'qdrantCollectionId'], to_jsonb(${collectionName}::text)
      )`,
    });
    return row ?? null;
  }

  async completeAnalysis(id, results) {
    const [row] = await this.updateWhere(eq(assessments.id, id), {
      status: 'complete',
      statusMessage: 'Analysis complete',
      results: {
        gaps: results.gaps,
        overallRisk: results.overallRisk,
        summary: results.summary || '',
        domainsAnalyzed: results.domainsAnalyzed || [],
        generatedAt: new Date().toISOString(),
      },
    });
    return row ?? null;
  }
}

export const assessmentRepository = new AssessmentRepository();
