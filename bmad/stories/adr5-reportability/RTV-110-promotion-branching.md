---
id: RTV-110-promotion-branching
title: "A2 — promotion branching: internal asset vs qualifying third-party service (non-exclusive)"
status: Draft
type: Story
epic: reportability-model
milestone: "RTV — DORA RoI reportability (ADR-0005)"
estimate: 8
labels: [retrieva, cert, backend, domain-logic, dora]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## ⛔ BLOCKED — implementation gated on architecture + security review. Document-only.

## Story
As a **compliance owner**, when an evaluation is selected (or a proposal confirmed), I want the system to
**branch on whether a qualifying third-party ICT service exists** — so a self-hosted/licence-only tool is
recorded as an **ICT asset** (no arrangement, no fake external provider) while a genuine service becomes an
**arrangement**, and a solution that is **both** gets both — instead of today's unconditional arrangement.

## Dependencies
RTV-109 (schema). Touches `services/evaluation/evaluationService.ts` (`selectWinner`) +
`services/intake/arrangementIntakeService.ts` (`confirmProposal`).

## Acceptance criteria
- **Qualifying service** → create the arrangement (as today) **+** attach a reportability determination initialized `pending_review` (never auto `reportable`).
- **Internal-only asset** (no qualifying service) → create a lightweight **evaluation outcome + CMDB asset reference**; **no** arrangement and **no** fabricated `external` provider node.
- **Non-exclusive:** one evaluated solution may yield **both** an asset reference **and** one or more service arrangements (e.g. self-hosted GLPI + an external managed-support contract).
- The SoD guard stays: a SERVICE principal still cannot `select` (ADR-0004); a human triggers promotion.

## Tests
The five classification scenarios (community GLPI / GLPI+support / M365 SaaS / perpetual licence / self-hosted+ongoing support) → asserted outcomes; the **mixed asset+service** case → both records; no fabricated provider for internal-only; determination always lands `pending_review`.

## Migration implications
None (behavioral). Consumes RTV-109's schema.

## Rollback
Guard the branch behind a flag defaulting to the current unconditional-create path; revert = flag off (no data migration).

## Evidence required for completion
The five-scenario + mixed-case test results; a DB check that an internal-only outcome created **no** arrangement/provider; a determination-state check (`pending_review`).
