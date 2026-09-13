/**
 * RTV-50 — recursive-CTE traversal proof. Seeds provider graphs on a real Postgres and
 * asserts N-hop reachability, diamond dedup (shortest depth), cycle termination,
 * function dependency closure, and the confirmed-only / maxDepth guards.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { startPg, stopPg } from './pgSetup.js';
import { connectPg, disconnectPg, getDb } from '../../config/db.js';
import { runMigrations } from '../../db/migrate.js';
import {
  users,
  organizations,
  workspaces,
  providerNodes,
  providerDependencies,
  criticalFunctions,
  criticalFunctionDependencies,
} from '../../db/schema/index.js';
import {
  providerSubcontractorChain,
  functionDependencyClosure,
} from '../../db/queries/providerGraph.js';

let db;
let orgId;
let userId;

const node = async (name, over = {}) => {
  const [n] = await db
    .insert(providerNodes)
    .values({
      organizationId: orgId,
      kind: 'external',
      canonicalName: name.toLowerCase(),
      displayName: name,
      ...over,
    })
    .returning();
  return n;
};

const edge = async (parent, child, confirmed = true) => {
  await db
    .insert(providerDependencies)
    .values({ organizationId: orgId, parentNodeId: parent.id, childNodeId: child.id, confirmed });
};

const names = (rows) => rows.map((r) => r.displayName).sort();

describe('Provider-graph recursive-CTE traversal (RTV-50)', () => {
  beforeAll(async () => {
    await startPg();
    await connectPg();
    await runMigrations();
    db = getDb();
  });

  afterAll(async () => {
    await disconnectPg();
    await stopPg();
  });

  beforeEach(async () => {
    // Full, order-independent reset. CI shares ONE Postgres DB across integration test
    // files, so other suites may have left rows (e.g. a workspace owned by a user) that a
    // plain `delete from users` can't remove (workspaces.user_id FK has no cascade).
    // TRUNCATE … CASCADE clears everything regardless of FK order.
    await db.execute(sql`
      truncate table
        provider_dependencies, provider_nodes,
        critical_function_dependencies, critical_functions,
        messages, conversations,
        vendor_questionnaires, assessments,
        workspace_members, organization_members,
        workspaces, organizations, users,
        questionnaire_templates
      restart identity cascade
    `);
    const [u] = await db
      .insert(users)
      .values({ email: `u-${Math.random().toString(36).slice(2)}@x.io`, password: 'h', name: 'n' })
      .returning();
    userId = u.id;
    const [o] = await db.insert(organizations).values({ name: 'Org', ownerId: u.id }).returning();
    orgId = o.id;
  });

  it('N-hop reachability: A→B→C→D returns B,C,D at depths 1,2,3', async () => {
    const [a, b, c, d] = [await node('A'), await node('B'), await node('C'), await node('D')];
    await edge(a, b);
    await edge(b, c);
    await edge(c, d);

    const rows = await providerSubcontractorChain(db, { organizationId: orgId, startNodeId: a.id });
    expect(names(rows)).toEqual(['B', 'C', 'D']);
    const depth = Object.fromEntries(rows.map((r) => [r.displayName, r.depth]));
    expect(depth).toEqual({ B: 1, C: 2, D: 3 });
  });

  it('diamond dedups a node to its shortest depth (A→B,A→C,B→D,C→D → D at depth 2 once)', async () => {
    const [a, b, c, d] = [await node('A'), await node('B'), await node('C'), await node('D')];
    await edge(a, b);
    await edge(a, c);
    await edge(b, d);
    await edge(c, d);

    const rows = await providerSubcontractorChain(db, { organizationId: orgId, startNodeId: a.id });
    expect(names(rows)).toEqual(['B', 'C', 'D']);
    const dRows = rows.filter((r) => r.displayName === 'D');
    expect(dRows).toHaveLength(1);
    expect(dRows[0].depth).toBe(2);
  });

  it('terminates on a cycle A→B→C→A (returns B,C, never loops)', async () => {
    const [a, b, c] = [await node('A'), await node('B'), await node('C')];
    await edge(a, b);
    await edge(b, c);
    await edge(c, a); // cycle back to start

    const rows = await providerSubcontractorChain(db, { organizationId: orgId, startNodeId: a.id });
    // A is on the path when C→A is considered → pruned; traversal terminates.
    expect(names(rows)).toEqual(['B', 'C']);
  });

  it('maxDepth bounds the traversal', async () => {
    const [a, b, c, d] = [await node('A'), await node('B'), await node('C'), await node('D')];
    await edge(a, b);
    await edge(b, c);
    await edge(c, d);

    const rows = await providerSubcontractorChain(db, {
      organizationId: orgId,
      startNodeId: a.id,
      maxDepth: 2,
    });
    expect(names(rows)).toEqual(['B', 'C']); // D (depth 3) excluded
  });

  it('confirmedOnly excludes unconfirmed edges by default, includes them when false', async () => {
    const [a, b, z] = [await node('A'), await node('B'), await node('Z')];
    await edge(a, b, true);
    await edge(b, z, false); // unconfirmed subcontractor

    const confirmed = await providerSubcontractorChain(db, {
      organizationId: orgId,
      startNodeId: a.id,
    });
    expect(names(confirmed)).toEqual(['B']);

    const all = await providerSubcontractorChain(db, {
      organizationId: orgId,
      startNodeId: a.id,
      confirmedOnly: false,
    });
    expect(names(all)).toEqual(['B', 'Z']);
  });

  it('functionDependencyClosure: provider (workspace node) + its chain', async () => {
    // A critical function depends on workspace W; W is a provider_node; W→X→Y.
    const [ws] = await db.insert(workspaces).values({ name: 'W', userId }).returning();
    const wNode = await node('W', { kind: 'workspace', workspaceId: ws.id, canonicalName: 'w' });
    const x = await node('X');
    const y = await node('Y');
    await edge(wNode, x);
    await edge(x, y);

    const [cf] = await db
      .insert(criticalFunctions)
      .values({ organizationId: orgId, name: 'Claims', criticality: 'critical' })
      .returning();
    await db
      .insert(criticalFunctionDependencies)
      .values({ criticalFunctionId: cf.id, workspaceId: ws.id });

    const rows = await functionDependencyClosure(db, { organizationId: orgId, functionId: cf.id });
    expect(names(rows)).toEqual(['W', 'X', 'Y']);
    const depth = Object.fromEntries(rows.map((r) => [r.displayName, r.depth]));
    expect(depth).toEqual({ W: 0, X: 1, Y: 2 }); // provider at 0, chain below
  });
});
