---
id: RTV-47-adopt-drizzle
title: "Adopt Drizzle — client, drizzle-kit migrations, drizzle-zod, pg test harness"
status: Ready
type: Story
epic: datastore-migration
milestone: "RTV — Datastore migration (Postgres + Drizzle)"
estimate: 5
labels: [retrieva, cert, backend, database, ci]
priority: P1
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **Backend Developer**, I want Drizzle wired as the ORM/query layer with migrations and a Postgres test harness so that all subsequent schema and query work builds on a consistent, typed, SQL-first foundation.

## Background

Parent epic **RTV-45** (#520). ADR: Drizzle over Prisma (recursive CTEs stay typed; `drizzle-zod` keeps Zod the DTO source of truth; `drizzle-kit` replaces `migrate-mongo`).

## Acceptance Criteria

- [ ] AC-1: `drizzle-orm` + `pg` (or `postgres`) client wired; connection reads `DATABASE_URL` at runtime (env-agnostic image — Kargo prerequisite); pooling configured.
- [ ] AC-2: **`drizzle-kit`** set up (`drizzle.config.ts`, `db/migrations/`); `db:generate` / `db:migrate` scripts; **replaces `migrate-mongo`** (old migrate-mongo config/scripts removed once nothing references Mongo).
- [ ] AC-3: **`drizzle-zod`** available so a table ↔ Zod schema relate (Zod stays the single source of truth).
- [ ] AC-4: **Test harness** — integration tests run against real Postgres via **testcontainers** (or `pg-mem` for unit-level); a `make test-integration` path spins it up.
- [ ] AC-5: CI updated — the Postgres service/container available to L2 integration tests; `tsc --noEmit` clean.

## Technical Notes

- This is plumbing only — no schema/data yet (RTV-48/49). Prove the client connects + a trivial migration applies + a test hits a real PG.
- Keep it TS-native (coordinates with the RTV-19→27 migration — pick Drizzle at the TS boundary).

## Definition of Done
- [ ] ACs met; a sample migration applies; integration test hits real Postgres in CI; parent RTV-45 (#520) updated

## Dependencies
- Parent: #520 (RTV-45); Depends on RTV-46
- Blocks: RTV-48
