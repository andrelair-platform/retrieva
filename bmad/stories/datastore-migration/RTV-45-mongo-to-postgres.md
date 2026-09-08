---
id: RTV-45-mongo-to-postgres
title: "EPIC: Migrate MongoDB → PostgreSQL + Drizzle"
status: Ready
type: Epic
epic: datastore-migration
milestone: "RTV — Datastore migration (Postgres + Drizzle)"
estimate: 21
labels: [epic, retrieva, cert, backend, database, architecture]
priority: P1
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Epic

As the **Tech Lead**, I want Retrieva's primary datastore moved from MongoDB/Mongoose to **PostgreSQL + Drizzle** so that the DORA arrangement graph has database-enforced referential integrity, native recursive-CTE traversal, ACID audit guarantees, and JSONB for the flexible bits — the substrate the product's compliance value actually requires.

## Why

Per the datastore ADR (`docs/architecture/datastore-postgresql.md`): the core is a relational graph, not documents. Mongo enforces integrity only in app code (weak for a compliance/audit product), makes graph traversal (`$graphLookup`) awkward, and treats the Register (RT.02.01 ≈ 15 linked tables) as a rebuild-in-app problem. **Drizzle over Prisma** because the concentration / sub-outsourcing-chain query is a `WITH RECURSIVE` traversal that stays *typed* in Drizzle, whereas Prisma forces an untyped `$queryRaw` for exactly that; drizzle-zod also reinforces Zod-as-DTO-source. Cheapest moment = now (prod is seed/demo + KB), before RTV-36 authors the graph and before RTV-19→27 types the data layer.

## Scope / Acceptance (epic-level)

- [ ] AC-1: PostgreSQL provisioned on-cluster (StatefulSet + Longhorn PVC + ESO creds), replacing the Mongo dependency; dev + prod overlays; backup/restore wired (per the platform DB pattern).
- [ ] AC-2: **Drizzle** adopted as the ORM — `drizzle-kit` migrations replace `migrate-mongo`; `drizzle-zod` relates Zod schemas ↔ tables (Zod stays the DTO source of truth).
- [ ] AC-3: Existing collections ported to Postgres — workspaces, conversations, messages, users, compliance knowledge-base metadata → tables (JSONB where genuinely document-shaped); referential FKs added.
- [ ] AC-4: A **recursive-CTE traversal** proof — a query that walks provider → subcontractor chain (or arrangement → function reachability) returns typed rows via Drizzle `sql\`WITH RECURSIVE …\``; this is the pattern RTV-28/32 build on.
- [ ] AC-5: Qdrant (vectors) + MinIO (blobs) unchanged; `pgvector` consolidation is explicitly OUT of scope (separate, later decision).
- [ ] AC-6: Data migration of current (seed/demo + KB) data; both stores run only transiently during cutover; Mongo dependency removed after.
- [ ] AC-7: vitest/integration suite green against Postgres (testcontainers or pg-mem); CI updated.

## Coordination
- **Before/with RTV-36** (arrangement graph authored directly in Postgres, no migration).
- **Folded into RTV-19→27** TS migration — pick Drizzle at the TS boundary instead of typing Mongoose. Update those stories' data-layer references accordingly.

## Dependencies
- Blocks: RTV-36 (and therefore the RTV-28→43 domain engine).
- Reshapes the data-layer assumptions in RTV-19, RTV-20, RTV-22, RTV-24 (Mongoose/migrate-mongo → Drizzle/drizzle-kit).
