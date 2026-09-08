# Retrieva — Datastore migration (MongoDB → PostgreSQL + Drizzle)

**Product / board:** Retrieva — RNCP39583 Certification (Project #2)
**Initiative:** Certification · **Home repo:** `retrieva`
**Reference:** `docs/architecture/datastore-postgresql.md` (the decision ADR)

Retrieva's core is now a relational graph with integrity guarantees (DORA arrangement graph +
Register + concentration traversal + audit trail). Move the primary datastore from MongoDB/Mongoose
to **PostgreSQL + Drizzle** (drizzle-kit migrations, drizzle-zod). Keep Qdrant + MinIO.

**Sequencing:** before/with RTV-36 (arrangement schema is greenfield) and folded into the RTV-19→27
TS migration — author the domain models once, in Postgres+Drizzle, not Mongoose-then-migrate.

| ID | Epic | Priority |
|---|---|---|
| RTV-45 | Migrate MongoDB → PostgreSQL + Drizzle (EPIC) | P1 (blocks the DORA graph foundation) |

## Implementable stories (RTV-45 broken down)

| ID | Story | Depends on | Priority |
|---|---|---|---|
| RTV-46 | Provision PostgreSQL on-cluster (StatefulSet + Longhorn + ESO, dev/prod) | — | P1 |
| RTV-47 | Adopt Drizzle (client + drizzle-kit migrations + drizzle-zod + pg test harness) | RTV-46 | P1 |
| RTV-48 | Port existing collections → Drizzle tables (FKs + JSONB) | RTV-47 | P1 |
| RTV-49 | Data migration + cutover (Mongo→Postgres) and remove Mongo | RTV-48 | P2 |
| RTV-50 | Recursive-CTE traversal repository (concentration/nth-party pattern) | RTV-48 | P1 |

Path: RTV-46 → RTV-47 → RTV-48 → { RTV-49 cutover, RTV-50 traversal }. RTV-48 unblocks RTV-36
(the DORA arrangement graph). RTV-50 is the query pattern that decided Drizzle over Prisma and feeds
RTV-28/32.
