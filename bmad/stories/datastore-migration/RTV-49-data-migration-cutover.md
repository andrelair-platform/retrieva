---
id: RTV-49-data-migration-cutover
title: "Data migration + cutover (Mongo → Postgres) and remove Mongo"
status: Ready
type: Story
epic: datastore-migration
milestone: "RTV — Datastore migration (Postgres + Drizzle)"
estimate: 5
labels: [retrieva, cert, backend, database, devops]
priority: P2
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As the **Tech Lead**, I want the current data moved into Postgres and the Mongo dependency removed so that Retrieva runs on a single relational datastore with no lingering dual-write risk.

## Background

Parent epic **RTV-45** (#520). Prod data is early-stage (seed/demo + the compliance KB), so this is low-risk — and if starting fresh is acceptable, **re-seeding into Postgres may replace a migration entirely** (decide at story start).

## Acceptance Criteria

- [ ] AC-1: An **idempotent migration script** copies current collections → Postgres tables (or, if agreed, a **re-seed** path via the existing seed scripts targeting Postgres) — decision recorded in the story.
- [ ] AC-2: Row-count + spot-check verification (per collection→table) that data landed intact.
- [ ] AC-3: **Transient dual-run** only during cutover; no long-lived dual-write. Backend flips to Postgres (`DATABASE_URL`) in dev, verified `/health` + key flows (auth, workspace, conversation, RAG).
- [ ] AC-4: After dev verification, prod cutover via the normal Kargo/CODEOWNERS path.
- [ ] AC-5: **Mongo removed** — MongoDB StatefulSet + `mongoose`/`migrate-mongo`/`mongodb-memory-server`/`express-mongo-sanitize` deps deleted; netpols/ESO/quotas cleaned (leave nothing orphaned).

## Technical Notes

- Qdrant + MinIO untouched.
- `express-mongo-sanitize` is a Mongo-operator-injection guard → not needed under Postgres (Drizzle parameterises); remove it here (coordinates with RTV-23).

## Definition of Done
- [ ] ACs met; prod on Postgres; Mongo fully removed; no orphaned resources; parent RTV-45 (#520) updated

## Dependencies
- Parent: #520 (RTV-45); Depends on RTV-48
