---
sidebar_position: 11
---

# Datastore: PostgreSQL + Drizzle (ADR)

**Status:** Accepted · **Date:** 2026-09-08 · **Scope:** Retrieva's primary datastore + ORM
**Supersedes:** MongoDB/Mongoose as the primary store · **Referenced by:** RTV-36, RTV-45, RTV-19→27
**Companion:** [DORA ICT-TPRM Domain Model](./dora-tprm-domain-model.md)

## Context

Retrieva began as a RAG assistant — document-shaped data (workspaces, conversations, messages,
a compliance knowledge base) — for which **MongoDB/Mongoose** was a reasonable early choice. But the
product's centre of gravity has moved (see the domain-model ADR) to a **DORA ICT-TPRM platform whose
core is a relational graph with integrity guarantees**: `Arrangement ↔ Provider ↔ Legal Entity ↔
Business Function ↔ Subcontractor ↔ Control ↔ Evidence ↔ Finding ↔ Risk`, the Register of
Information (RT.02.01 ≈ 15 linked tables), concentration / nth-party traversal, and an immutable
audit trail. That is relational + graph work, and Mongo now fights the grain on exactly the parts
that carry the product's value.

## Decision

**Use PostgreSQL (with JSONB) as the primary datastore, and Drizzle as the ORM/query layer.**
Keep **Qdrant** (vectors) and **MinIO** (document blobs) as-is. Decide and switch **before RTV-36**
(the arrangement schema is greenfield) and execute the migration as part of the RTV-19→27 TypeScript
work, so the domain models are authored once, in Postgres+Drizzle, not in Mongoose then migrated.

## Why PostgreSQL over MongoDB

| Requirement (RTV-15/28/32/18/37) | Postgres | MongoDB |
|---|---|---|
| Referential integrity across the arrangement graph | native FKs | app-code only (drift risk in the data whose integrity *is* the value prop) |
| Graph traversal / reachability (change-impact, "4 SaaS all on AWS") | recursive CTEs / joins | `$graphLookup` — awkward, limited |
| Register of Information (RT.02.01, ~15 linked tables) | it *is* SQL | rebuild joins in app |
| Coverage scoring, group consolidation | first-class aggregations/joins | `$lookup` second-class |
| Immutable audit trail, human-approved findings | native ACID | multi-doc txns are a bolt-on |
| Flexible/semi-structured (evidence metadata, questionnaire answers, LLM payloads) | **JSONB** | native (but not needed enough to justify the above losses) |

The document flexibility that first favoured Mongo is retained via **JSONB**, and the genuinely
document-shaped data isn't in the DB anyway: **PDFs → MinIO**, **vectors → Qdrant**. "We handle
documents" is therefore not a reason to keep a document DB. The decisive point is compliance:
Retrieva's value proposition is *relational correctness*, and on Mongo that guarantee lives only in
application code — a weak statement to a regulator/auditor.

## Why Drizzle over Prisma

The concentration / sub-outsourcing-chain query is the product-defining operation, and it is a
**`WITH RECURSIVE`** traversal. This is where the ORM choice is decided:

- **Recursive CTEs stay typed in Drizzle.** Drizzle is a thin, SQL-first, fully-typed layer:
  `db.execute(sql\`WITH RECURSIVE ...\`)` is first-class and typed. **Prisma has no first-class
  recursive-CTE support** — you drop to `$queryRaw` (an *untyped* escape hatch) for exactly the most
  important queries, losing Prisma's main benefit where you need it most. Prisma's query engine also
  adds latency on nested joins.
- **Fits the existing Zod schemas.** `drizzle-zod` derives/relates Zod ↔ table schemas, reinforcing
  the "Zod is the DTO source of truth" pattern (RTV-29/18) rather than maintaining a parallel Prisma
  schema DSL.
- **Migrations:** `drizzle-kit` replaces `migrate-mongo`.
- **RNCP signal:** owning the SQL (recursive traversal, indexes, query plans) is a stronger
  competency signal than an ORM that hides it.

**Honest caveat (accepted):** Drizzle is younger and less batteries-included than Prisma (no polished
Studio, relations are more hand-wired). For a SQL-fluent build where the graph query is the crux,
that trade is correct.

## What maps where

| Data | Store |
|---|---|
| Arrangement graph, Register, controls, findings, risks, audit log | **Postgres** tables + FKs; recursive CTEs for traversal |
| Evidence metadata, questionnaire answers, LLM/assessment payloads | **Postgres JSONB** columns |
| Contract PDFs / uploaded documents | **MinIO** (unchanged) |
| RAG chunk vectors | **Qdrant** (unchanged; `pgvector` consolidation is a *separate*, later question — do not couple) |
| Workspaces, conversations, messages (chat) | **Postgres** (relational + JSONB) |

## Migration approach (RTV-45)

- Model the new **DORA graph directly in Postgres+Drizzle** (RTV-36) — greenfield, no migration.
- Port the existing chat/workspace/knowledge-base collections → Postgres tables (JSONB where
  document-shaped). Prod data is early-stage (seed/demo + KB), so data-migration cost is low —
  **the cheapest moment to switch is now.**
- Replace `migrate-mongo` with `drizzle-kit`; run both stores only transiently during cutover, never
  long-term.
- Sequenced **before/with** RTV-36 and folded into the RTV-19→27 TS migration (pick Drizzle at the
  TS boundary instead of typing Mongoose).

## Consequences

- Referential integrity + ACID + native graph traversal become database guarantees, not app hopes —
  the defensible compliance/audit story.
- One engine (Postgres + JSONB) covers relational + document; Qdrant/MinIO unchanged.
- The RTV-19→27 TS migration targets Drizzle, not Mongoose; RTV-36 is authored in Postgres.
- A new migration epic **RTV-45** tracks the Mongo→Postgres cutover.
