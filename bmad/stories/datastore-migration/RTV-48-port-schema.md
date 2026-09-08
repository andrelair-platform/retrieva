---
id: RTV-48-port-schema
title: "Port existing collections to Drizzle tables (FKs + JSONB)"
status: Ready
type: Story
epic: datastore-migration
milestone: "RTV — Datastore migration (Postgres + Drizzle)"
estimate: 8
labels: [retrieva, cert, backend, database, domain-logic]
priority: P1
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **Backend Developer**, I want the current Mongo collections expressed as Drizzle tables with real foreign keys so that the existing app data has a relational, integrity-enforced home before the DORA graph is layered on.

## Background

Parent epic **RTV-45** (#520). Translates the existing Mongoose models (users, workspaces, conversations, messages, compliance knowledge-base metadata, plus auth/MFA, Stripe/billing refs) to Drizzle tables. Document-shaped fields → JSONB; relationships → FKs.

## Acceptance Criteria

- [ ] AC-1: Every current Mongoose model has a Drizzle table equivalent in `db/schema/`; relationships that were app-side refs become **FKs** (users↔workspaces, workspace↔conversations↔messages, etc.).
- [ ] AC-2: Genuinely document-shaped fields (settings blobs, LLM payloads, questionnaire answers, message content metadata) → **JSONB** columns, not over-normalised.
- [ ] AC-3: `drizzle-zod` relates each table to its Zod schema; the app's DTO types derive from these (no duplicate hand-written shapes).
- [ ] AC-4: First real **`drizzle-kit`** migration generates the schema; applies cleanly on an empty DB.
- [ ] AC-5: Indexes for the hot lookups (workspace scoping, conversation-by-workspace, message-by-conversation).
- [ ] AC-6: vitest against Postgres (testcontainers) — CRUD + a referential-integrity test (FK violation rejected).

## Technical Notes

- This ports the **existing** app models only. The DORA arrangement graph is **RTV-36** (separate, greenfield, depends on this being in place).
- Keep `entity_id`/workspace scoping consistent so the multi-tenant + group-ready shape (RTV-28/36) drops in cleanly.

## Definition of Done
- [ ] ACs met; migration applies; FK-integrity test passes; parent RTV-45 (#520) updated

## Dependencies
- Parent: #520 (RTV-45); Depends on RTV-47
- Blocks: RTV-49, RTV-50; unblocks RTV-36
