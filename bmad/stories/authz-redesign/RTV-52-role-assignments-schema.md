---
id: RTV-52-role-assignments-schema
title: "role_assignments schema + collapse Org/Workspace → Group/Entity scopes"
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

As a **Backend Developer**, I want a single scoped `role_assignments` table replacing the two membership models so that authorization has one source of truth mirroring the domain hierarchy.

## Background

Parent **RTV-51** (#…); ADR §1/§6. Depends on Postgres+Drizzle (RTV-45) + schema (RTV-48).

## Acceptance Criteria

- [ ] AC-1: `role_assignments(id, user_id FK, scope_type ['group'|'entity'], scope_id, role, status, created_at)` as a Drizzle table; a user may have many.
- [ ] AC-2: `users` reduced to identity (+ a real `platform_admin` boolean); the global `user/admin` role field removed.
- [ ] AC-3: **Org + Workspace membership collapsed** to Group/Entity scopes; `OrganizationMember` + `WorkspaceMember` removed after migration.
- [ ] AC-4: Migration maps existing memberships → `role_assignments` (best-effort role translation: owner→entity_admin, member→analyst/viewer, org_admin→group_admin — documented).
- [ ] AC-5: Indexes for the hot lookup (`by user`, `by scope`); FK integrity test.
- [ ] AC-6: vitest (pg) — a user with multiple scoped assignments resolves correctly.

## Technical Notes
- Coordinate with RTV-36/48 so `scope_id` references the Legal Entity / Group rows.
- No enforcement logic here — just the model + migration (RTV-53 adds `can()`).

## Definition of Done
- [ ] ACs met; migration applies; old membership tables gone; parent RTV-51 updated

## Dependencies
- Parent: RTV-51; Depends on RTV-48. Blocks: RTV-53.
