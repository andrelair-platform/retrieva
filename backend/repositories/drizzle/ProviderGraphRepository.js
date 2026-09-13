/**
 * Drizzle ProviderGraphRepository (RTV-49 pt5). CRUD over the first-class provider graph
 * (RTV-48): provider_nodes (identity, deduped per org by canonical_name) + provider_dependencies
 * (parent→child edges by node-id). Presents edges to concentrationService in the legacy
 * {parent:{kind,workspaceId,name,tier}, child:{…}} shape (rebuilt via node joins) so the pure
 * computeConcentration keeps working; the recursive traversal lives in db/queries/providerGraph.js.
 */
import { and, eq, asc, desc } from 'drizzle-orm';
import { BaseDrizzleRepository } from './BaseDrizzleRepository.js';
import { providerNodes, providerDependencies } from '../../db/schema/index.js';

const norm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase();

export class ProviderGraphRepository extends BaseDrizzleRepository {
  constructor(opts = {}) {
    super(providerDependencies, opts);
  }

  // ── nodes ────────────────────────────────────────────────────────────────
  /** Find (by org + canonical name) or create a provider node. */
  async findOrCreateNode(organizationId, { kind, workspaceId = null, name, tier = null }) {
    const canonicalName = norm(name);
    const existing = await this.db
      .select()
      .from(providerNodes)
      .where(
        and(
          eq(providerNodes.organizationId, organizationId),
          eq(providerNodes.canonicalName, canonicalName)
        )
      )
      .limit(1);
    if (existing[0]) return existing[0];
    const [node] = await this.db
      .insert(providerNodes)
      .values({ organizationId, kind, workspaceId, canonicalName, displayName: name, tier })
      .returning();
    return node;
  }

  // ── edges (with node objects rebuilt for computeConcentration) ──────────────
  async _loadEdges(organizationId, { confirmedOnly = false } = {}) {
    const parent = { ...providerNodes };
    // Two joins against provider_nodes (parent + child) via aliased sub-selects.
    const conds = [eq(providerDependencies.organizationId, organizationId)];
    if (confirmedOnly) conds.push(eq(providerDependencies.confirmed, true));
    const edges = await this.db
      .select()
      .from(providerDependencies)
      .where(and(...conds))
      .orderBy(asc(providerDependencies.confirmed), desc(providerDependencies.createdAt));
    void parent;

    // Resolve node objects (small graphs; a per-edge lookup map keeps it simple).
    const nodeIds = [...new Set(edges.flatMap((e) => [e.parentNodeId, e.childNodeId]))];
    const nodeMap = new Map();
    for (const id of nodeIds) {
      const [n] = await this.db.select().from(providerNodes).where(eq(providerNodes.id, id)).limit(1);
      if (n) nodeMap.set(id, n);
    }
    const toNode = (n) =>
      n
        ? { kind: n.kind, workspaceId: n.workspaceId, name: n.displayName, tier: n.tier }
        : { kind: 'external', workspaceId: null, name: '', tier: null };

    return edges.map((e) => ({
      id: e.id,
      parent: toNode(nodeMap.get(e.parentNodeId)),
      child: toNode(nodeMap.get(e.childNodeId)),
      relationship: e.relationship,
      source: e.source,
      confidence: e.confidence,
      confirmed: e.confirmed,
      createdAt: e.createdAt,
    }));
  }

  /** Confirmed edges for concentration analysis. */
  async loadConfirmedEdges(organizationId) {
    return this._loadEdges(organizationId, { confirmedOnly: true });
  }

  /** All edges (confirmed + unconfirmed) for the graph view / dependency list. */
  async listDependencies(organizationId) {
    return this._loadEdges(organizationId, { confirmedOnly: false });
  }

  /** Confirm (true) or reject+delete (false) an extracted edge. */
  async setConfirmed(organizationId, id, confirmed) {
    if (confirmed === false) {
      const [row] = await this.db
        .delete(providerDependencies)
        .where(
          and(
            eq(providerDependencies.id, id),
            eq(providerDependencies.organizationId, organizationId)
          )
        )
        .returning();
      return row ?? null;
    }
    const [row] = await this.db
      .update(providerDependencies)
      .set({ confirmed: true, lastVerifiedAt: new Date() })
      .where(
        and(eq(providerDependencies.id, id), eq(providerDependencies.organizationId, organizationId))
      )
      .returning();
    return row ?? null;
  }

  /** True if a parent→child edge already exists (idempotent extraction guard). */
  async edgeExists(organizationId, parentNodeId, childNodeId) {
    const [row] = await this.db
      .select({ id: providerDependencies.id })
      .from(providerDependencies)
      .where(
        and(
          eq(providerDependencies.organizationId, organizationId),
          eq(providerDependencies.parentNodeId, parentNodeId),
          eq(providerDependencies.childNodeId, childNodeId)
        )
      )
      .limit(1);
    return !!row;
  }

  async createEdge(values) {
    const [row] = await this.db.insert(providerDependencies).values(values).returning();
    return row;
  }
}

export const providerGraphRepository = new ProviderGraphRepository();
