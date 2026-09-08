---
id: RTV-53-role-set-capability-layer
title: "Domain role set + central capability/policy module (single can())"
status: Ready
type: Story
epic: authz-redesign
milestone: "RTV — Authorization redesign"
estimate: 8
labels: [retrieva, cert, security, backend, domain-logic]
priority: P1
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **Backend Developer**, I want the full governance role set and a single capability module so that every access check goes through one inspectable `can(user, action, resource)` instead of scattered `role === …` checks.

## Background

Parent **RTV-51** (#…); ADR §2/§3. Replaces the three enforcement mechanisms (`authorize('admin')`, hardcoded `role === 'owner'`, ad-hoc permission booleans).

## Acceptance Criteria

- [ ] AC-1: Full role set defined: platform (`platform_admin`); group (`group_admin`, `group_risk`, `group_compliance`); entity (`entity_admin`, `analyst`, `ict_risk_officer`, `legal`, `dpo`, `business_owner`, `auditor`, `viewer`); external (`vendor_contact`).
- [ ] AC-2: **Capability map** as versioned config: `(role, scope) → allowed actions on resource types` (e.g. `finding:approve`→`ict_risk_officer`; `assessment:edit`→`analyst`; `register:export`→risk/compliance; `arrangement:read`→most).
- [ ] AC-3: A single **`can(user, action, resource)`** resolver that reads `role_assignments` (RTV-52) + the capability map; default-deny.
- [ ] AC-4: Express middleware `authorizeAction(action)` built on `can()`; **all existing route guards migrated to it** (remove `authorize('admin')` / `role === 'owner'` / permission-boolean checks).
- [ ] AC-5: `auditor` is read-only everywhere; `business_owner` limited to own functions/arrangements.
- [ ] AC-6: vitest — a capability matrix test (role × action → allow/deny) as the regression guard.

## Technical Notes
- Keep the capability map data-driven + inspectable (like the control library) so "who can do X?" is one query.
- Entity isolation (row scoping) is RTV-54; SoD (maker≠checker) is RTV-55 — this story is role→action.

## Definition of Done
- [ ] ACs met; capability matrix test green; zero remaining scattered role checks; parent RTV-51 updated

## Dependencies
- Parent: RTV-51; Depends on RTV-52. Blocks: RTV-54, RTV-55, RTV-56.
