---
sidebar_position: 12
---

# Recursive-CTE graph traversal (concentration engine)

**Status:** Implemented (RTV-50) · **Depends on:** [Datastore: PostgreSQL + Drizzle](./datastore-postgresql.md) · **Feeds:** RTV-28 (arrangement graph), RTV-32 (change-impact)

This is the product-defining operation — *"if a provider or its sub-provider fails, which
critical functions stop, and where is the firm over-concentrated?"* (DORA Art. 28(4) / 29) — and
the reason Retrieva chose **PostgreSQL + Drizzle over Mongo/Prisma**: the nth-party traversal stays
**first-class, typed SQL** instead of an untyped escape hatch. It runs in the database (indexed edge
joins) rather than as an in-memory JS DFS.

## The graph

Modelled as a first-class adjacency list (see the [datastore ADR](./datastore-postgresql.md)):

- **`provider_nodes`** — the node identity space, one row per provider per org
  (`unique(organization_id, canonical_name)`). A node is an assessed workspace
  (`kind = workspace`) or an external sub-provider (`kind = external`, e.g. *OpenAI → Azure*).
- **`provider_dependencies`** — directed `parent_node_id → child_node_id` **edges**
  (indexed both ways), each `confirmed` by a human before it affects scoring.

Because identity is a real node (not a string), *shared-substrate* detection — "4 vendors all sit on
the same Azure", the Art. 29 systemic signal — is a correct `GROUP BY child_node_id`, not fragile
name matching.

## The traversal (`WITH RECURSIVE`)

`backend/db/queries/providerGraph.js` exposes two typed traversals. The core one — the transitive
subcontracting chain below a provider:

```sql
WITH RECURSIVE chain AS (
  -- base: direct children of the start node
  SELECT e.child_node_id AS node_id, 1 AS depth,
         ARRAY[e.parent_node_id, e.child_node_id] AS path
  FROM provider_dependencies e
  WHERE e.organization_id = $org AND e.parent_node_id = $start AND e.confirmed
  UNION ALL
  -- step: follow edges whose child isn't already on the path (cycle guard)
  SELECT e.child_node_id, c.depth + 1, c.path || e.child_node_id
  FROM provider_dependencies e
  JOIN chain c ON e.parent_node_id = c.node_id
  WHERE e.organization_id = $org
    AND c.depth < $maxDepth
    AND NOT (e.child_node_id = ANY(c.path))     -- ← cycle-safe
    AND e.confirmed
)
SELECT n.*, MIN(c.depth) AS depth
FROM chain c JOIN provider_nodes n ON n.id = c.node_id
GROUP BY n.id
ORDER BY depth;
```

**Why it terminates.** Each row carries the visited `path` (a `uuid[]`). The recursive step refuses
any edge whose child is already on the path, so a subcontractor cycle `A→B→C→A` stops when `C→A` is
considered (`A` is on the path). A `maxDepth` cap (default **12**) is the secondary bound. Nodes are
deduped to the **shortest** depth at which they're reached (a diamond `A→B, A→C, B→D, C→D` yields
`D` once, at depth 2).

## The two functions

| Function | Answers | Seed |
|---|---|---|
| `providerSubcontractorChain(db, { organizationId, startNodeId })` | the transitive sub-providers below a provider (its nth-party reach) | the start node's direct children |
| `functionDependencyClosure(db, { organizationId, functionId })` | every provider a critical/important function transitively depends on ("if any fail, this function is impacted") | the function's direct providers (workspace nodes, depth 0) |

Both are typed (`ReachedNode[]`), cycle-safe, depth-bounded, and take `confirmedOnly` (default true)
so unconfirmed AI-extracted edges don't affect scoring until a human confirms them.

## Example

```js
import { providerSubcontractorChain } from '../db/queries/providerGraph.js';
import { getDb } from '../config/db.js';

// Everything Vendor A ultimately sub-processes through:
const chain = await providerSubcontractorChain(getDb(), {
  organizationId: org.id,
  startNodeId: vendorANode.id,
});
// → [{ displayName: 'Azure', depth: 1, kind: 'external', ... }, ...]
```

## Verification

`backend/tests/integrationtest/providerGraph.integration.test.js` (real Postgres via testcontainers)
covers N-hop reachability, diamond dedup, **cycle termination**, `maxDepth`, the `confirmedOnly`
gate, and the function closure — 6/6 green.

This replaces the in-memory JS DFS in `services/concentrationService.js` (`reach()`); the pure
scoring (`computeConcentration`) will consume these DB traversals during the RTV-49 repository
rewrite. Owning this SQL — traversal, cycle guard, indexes — is the RNCP "I own my datastore"
evidence (BC02/BC04).
