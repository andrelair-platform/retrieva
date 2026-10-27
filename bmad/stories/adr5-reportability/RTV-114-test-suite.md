---
id: RTV-114-test-suite
title: "A6 — test suite: classification scenarios, mixed, tenant isolation, authz, parity, history, rollback"
status: Draft
type: Story
epic: reportability-model
milestone: "RTV — DORA RoI reportability (ADR-0005)"
estimate: 5
labels: [retrieva, cert, backend, testing, dora]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## ⛔ BLOCKED — implementation gated on architecture + security review. Document-only.

## Story
As a **reviewer**, I want the reportability model covered by tests that prove classification correctness,
**tenant isolation**, **authorization/SoD**, **export parity (backward compatibility)**, **historical-record
preservation**, and **rollback** — so a technically successful implementation can never silently change the
official DORA register or leak across tenants.

## Dependencies
RTV-109…RTV-113 (spans the epic). Follows `testing.md` layers (L1 unit + L2 integration on real Postgres + L3 where a contract applies).

## Acceptance criteria (test classes, all green)
- **Five classification scenarios** — community GLPI (not_reportable) · GLPI+managed support (asset + reportable service) · M365 SaaS (reportable) · perpetual licence no-service (not_reportable) · self-hosted+ongoing support (pending_review → reviewed).
- **Mixed asset/service** — one solution yields both an asset ref and ≥1 service arrangement.
- **Tenant isolation** — determinations/arrangements never cross `organization_id`; the IS-tenant entity scope holds.
- **Authorization/SoD** — only `reportability:determine` humans decide; SERVICE denied; proposer ≠ approver.
- **Export parity** — the seeded ktayl register (AWS/Cloudflare/M365-class) stays **fully** in RT.02.01 pre-cutover; formal export byte-identical until the gated cutover.
- **Historical records** — pre-existing arrangements/evaluations/`action_audit` untouched by the migration; determination history append-only.
- **Rollback** — migration down + cutover-flag-off restore the exact prior model + export.

## Tests
This story *is* the tests; coverage threshold per `testing.md` (≥70% on business logic); L2 on real Postgres (testcontainers/service-PG), not mocks-only.

## Migration implications
None (test-only).

## Rollback
N/A (tests).

## Evidence required for completion
The passing suite + coverage report; the five-scenario matrix results; the export-parity proof; the rollback (down-migration + flag-off) test output.
