/**
 * Provider-graph traversal queries (RTV-50) — the concentration / nth-party
 * reachability engine, expressed as typed `WITH RECURSIVE` over the RTV-48
 * `provider_nodes` + `provider_dependencies` (edge) tables.
 *
 * This is the product-defining operation (DORA Art. 28(4)/29) and the reason RTV-45
 * chose Postgres+Drizzle over Mongo/Prisma: the traversal stays first-class SQL and
 * fully typed. It replaces the in-memory JS DFS in services/concentrationService.js
 * (`reach()`), pushing the graph walk into the database (indexed edge joins).
 *
 * Cycle-safety: each recursion carries the visited `path` (uuid[]) and prunes any edge
 * whose child is already on the path (`NOT child = ANY(path)`) — so a subcontractor
 * cycle (A→B→A) terminates. A `maxDepth` cap (default 12, matching the legacy guard) is
 * the secondary bound. Edges are indexed on `parent_node_id` / `child_node_id`.
 */
import { sql } from 'drizzle-orm';

/**
 * @typedef {Object} ReachedNode
 * @property {string}  id            provider_nodes.id
 * @property {'workspace'|'external'} kind
 * @property {string}  canonicalName normalised identity key
 * @property {string}  displayName   human name
 * @property {('critical'|'important'|'standard'|null)} tier
 * @property {number}  depth         shortest hop distance from the start (1-based for
 *                                   the subcontractor chain; 0 = the provider itself for
 *                                   the function closure)
 */

const DEFAULT_MAX_DEPTH = 12;

/**
 * All sub-providers reachable downstream from a provider node — its transitive
 * subcontracting chain (nth-party reach). Cycle-safe, depth-bounded, deduped to the
 * shortest depth at which each node is reached.
 *
 * @param {import('drizzle-orm/node-postgres').NodePgDatabase} db
 * @param {Object} opts
 * @param {string} opts.organizationId
 * @param {string} opts.startNodeId        provider_nodes.id to traverse from
 * @param {number} [opts.maxDepth=12]
 * @param {boolean} [opts.confirmedOnly=true]  only traverse human-confirmed edges
 * @returns {Promise<ReachedNode[]>}
 */
export async function providerSubcontractorChain(
  db,
  { organizationId, startNodeId, maxDepth = DEFAULT_MAX_DEPTH, confirmedOnly = true }
) {
  const confirmed = confirmedOnly ? sql`and e.confirmed` : sql``;
  const res = await db.execute(sql`
    with recursive chain as (
      -- base: direct children of the start node
      select
        e.child_node_id                       as node_id,
        1                                     as depth,
        array[e.parent_node_id, e.child_node_id] as path
      from provider_dependencies e
      where e.organization_id = ${organizationId}
        and e.parent_node_id = ${startNodeId}
        ${confirmed}
      union all
      -- step: follow edges whose child isn't already on the path (cycle guard)
      select
        e.child_node_id,
        c.depth + 1,
        c.path || e.child_node_id
      from provider_dependencies e
      join chain c on e.parent_node_id = c.node_id
      where e.organization_id = ${organizationId}
        and c.depth < ${maxDepth}
        and not (e.child_node_id = any(c.path))
        ${confirmed}
    )
    select
      n.id,
      n.kind,
      n.tier,
      n.canonical_name as "canonicalName",
      n.display_name   as "displayName",
      min(c.depth)::int as depth
    from chain c
    join provider_nodes n on n.id = c.node_id
    group by n.id, n.kind, n.tier, n.canonical_name, n.display_name
    order by depth, "displayName"
  `);
  return res.rows;
}

/**
 * The full set of provider nodes a critical/important function transitively depends on:
 * its direct providers (assessed workspaces, depth 0) plus their subcontracting chains.
 * This is the "if any of these fail, the function is impacted" closure (the legacy
 * `cifReach`). The RTV-28 arrangement graph plugs in here later (same edge substrate).
 *
 * @param {import('drizzle-orm/node-postgres').NodePgDatabase} db
 * @param {Object} opts
 * @param {string} opts.organizationId
 * @param {string} opts.functionId          critical_functions.id
 * @param {number} [opts.maxDepth=12]
 * @param {boolean} [opts.confirmedOnly=true]
 * @returns {Promise<ReachedNode[]>}
 */
export async function functionDependencyClosure(
  db,
  { organizationId, functionId, maxDepth = DEFAULT_MAX_DEPTH, confirmedOnly = true }
) {
  const confirmed = confirmedOnly ? sql`and e.confirmed` : sql``;
  const res = await db.execute(sql`
    with recursive
    seed as (
      -- the function's direct providers, mapped to their provider_node (kind=workspace)
      select pn.id as node_id
      from critical_function_dependencies d
      join provider_nodes pn
        on pn.workspace_id = d.workspace_id
       and pn.organization_id = ${organizationId}
      where d.critical_function_id = ${functionId}
    ),
    chain as (
      select node_id, 0 as depth, array[node_id] as path from seed
      union all
      select
        e.child_node_id,
        c.depth + 1,
        c.path || e.child_node_id
      from provider_dependencies e
      join chain c on e.parent_node_id = c.node_id
      where e.organization_id = ${organizationId}
        and c.depth < ${maxDepth}
        and not (e.child_node_id = any(c.path))
        ${confirmed}
    )
    select
      n.id,
      n.kind,
      n.tier,
      n.canonical_name as "canonicalName",
      n.display_name   as "displayName",
      min(c.depth)::int as depth
    from chain c
    join provider_nodes n on n.id = c.node_id
    group by n.id, n.kind, n.tier, n.canonical_name, n.display_name
    order by depth, "displayName"
  `);
  return res.rows;
}
