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
| RTV-45 | Migrate MongoDB → PostgreSQL + Drizzle | P1 (blocks the DORA graph foundation) |
