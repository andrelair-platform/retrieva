---
id: RTV-111-determination-api-authz
title: "A3 — reportability determination API: human-only authz, SoD, immutable audit"
status: Draft
type: Story
epic: reportability-model
milestone: "RTV — DORA RoI reportability (ADR-0005)"
estimate: 8
labels: [retrieva, cert, backend, security, dora]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## ⛔ BLOCKED — implementation gated on architecture + security review. Document-only.

## Story
As an **authorized risk/compliance reviewer**, I want to set or override a reportability determination
(`reportable`/`not_reportable`) with a recorded rationale + evidence — and **only I (a human)** can, never
an automated principal — so every regulated determination has clear, auditable human accountability (DORA
Art. 5/28 + ADR-0004 SoD).

## Dependencies
RTV-109 (schema). Reuses the ADR-0004 `can()` capability map + `action_audit`.

## Acceptance criteria
- A determination endpoint gated by a new capability `reportability:determine`.
- **SERVICE principals are denied** (ADR-0004 `principalType` guard) → 403; the AI may *propose* a value (`pending_review` + rationale + confidence) but **cannot** apply a decision — proposer ≠ approver.
- Setting/overriding a determination is **append-only audited**: rationale · linked evidence · approver identity + role · UTC timestamp; history immutable + survives principal disable.
- A legacy `legacy_assumed_reportable` can only become human-confirmed `reportable`/`not_reportable` through this reviewed path (no silent conversion).

## Tests
Authz matrix (authorized human allowed; unauthorized human 403; **SERVICE 403**); audit immutability (no update/delete of a determination record); override leaves a reasoned trail; a proposed value stays `pending_review` until a human confirms.

## Migration implications
None (new endpoint + reads RTV-109 schema).

## Rollback
Disable the endpoint/capability; determination rows are inert if unused (export still reads `legacy_assumed_reportable`).

## Evidence required for completion
The authz test matrix; a sample append-only determination + override audit record; confirmation a SERVICE token is refused.
