---
id: RTV-36-arrangement-schema
title: "Arrangement star schema (Arrangement + Provider + Entity + Function), group-ready"
status: Ready
type: Story
epic: dora-tprm-domain
milestone: "RTV — DORA ICT-TPRM domain model"
estimate: 5
labels: [retrieva, cert, backend, database, domain-logic]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **backend developer**, I want the ICT Arrangement modelled as the core object with Provider/Legal-Entity/Business-Function as dimensions so that risk is tracked where DORA regulates it and the schema is group-ready from day one.

## Background

Parent epic **RTV-28** (#499). Per the domain-model ADR (`docs/architecture/dora-tprm-domain-model.md` §1, §8): "France/Azure/Claims" ≠ "Belgium/Azure/email" — the *arrangement* is the fact, the provider is a dimension.

## Acceptance Criteria

- [ ] AC-1: `Arrangement` model with FKs to `Provider`, `LegalEntity`, `BusinessFunction`, `ICTService`; carries `data_classes[]`, `data_residency`, `criticality (CIF)`, `dependency`, `exit_difficulty`.
- [ ] AC-2: **`entity_id` (multi-tenant) on every arrangement** even though v1 runs a single entity.
- [ ] AC-3: `Provider → Subcontractor` (nth-party) relationship modelled.
- [ ] AC-4: `BusinessFunction.critical_or_important` boolean drives proportionality downstream.
- [ ] AC-5: Intra-group arrangement type representable (RT.02.01 B_03) — a group entity as provider.
- [ ] AC-6: Indexes for graph traversal (provider→arrangements, function→arrangements); vitest unit tests on the model + a seed fixture.

## Technical Notes

- **PostgreSQL + Drizzle** (per `docs/architecture/datastore-postgresql.md`) — author this schema
  directly in Postgres with real FKs; use `drizzle-zod` so Zod stays the DTO source of truth. NOT
  Mongoose. Depends on RTV-45 (Mongo→Postgres migration) being in place.
- FKs (AC-1/3) are database-enforced; "graph traversal indexes" (AC-6) support the recursive-CTE
  queries RTV-28/32 build on.
- No group *features* here — schema only (ADR §8).

## Definition of Done
- [ ] ACs met; vitest green (pg testcontainer/pg-mem); seed fixture loads; ADR §1 shape honoured
- [ ] Parent epic RTV-28 (#499) updated

## Dependencies
- Parent: andrelair-platform/retrieva#499 (RTV-28)
- Depends on: RTV-45 (PostgreSQL + Drizzle in place)
- Blocks: RTV-37, RTV-38, RTV-41
