---
id: RTV-54-entity-isolation
title: "Least-privilege + entity isolation at the Drizzle query layer"
status: Ready
type: Story
epic: authz-redesign
milestone: "RTV — Authorization redesign"
estimate: 5
labels: [retrieva, cert, security, backend, database]
priority: P1
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **compliance owner**, I want every data access scoped to the user's assigned entities so that one legal entity cannot see another's confidential arrangements/contracts, while group roles get read-across.

## Background

Parent **RTV-51** (#…); ADR §5. This is the row-level isolation that makes cross-entity confidentiality (France ⊥ Belgium) and group consolidation (RTV-35) both possible.

## Acceptance Criteria

- [ ] AC-1: A scoping helper derives the user's **allowed entity_ids** from `role_assignments`; entity-scoped queries are filtered by it (Drizzle `where` composition) — **default-deny** (no assignment → no rows).
- [ ] AC-2: **Group roles** (`group_*`) opt into **read-across** all entities in their group; entity roles are confined to their entity.
- [ ] AC-3: Applied to every entity-scoped resource (arrangements, evidence, findings, risks, register, conversations).
- [ ] AC-4: An IDOR/isolation test: user of entity A cannot read/write entity B's rows (403/empty), even by guessing ids.
- [ ] AC-5: `platform_admin` + `auditor` scoping behave per policy (auditor = read-only within its granted scope).

## Technical Notes
- Prefer a single query-builder wrapper so isolation can't be forgotten per-endpoint; consider a repository layer over raw Drizzle.
- Complements `can()` (RTV-53): `can()` answers *action*; this answers *which rows*.

## Definition of Done
- [ ] ACs met; isolation/IDOR test green; parent RTV-51 updated

## Dependencies
- Parent: RTV-51; Depends on RTV-53. Enables RTV-35 (group).
