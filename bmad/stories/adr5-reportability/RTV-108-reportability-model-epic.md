---
id: RTV-108-reportability-model-epic
title: "Epic — ICT asset / third-party-service / RoI reportability model (ADR-0005)"
status: Draft
type: Epic
epic: reportability-model
milestone: "RTV — DORA RoI reportability (ADR-0005)"
estimate: 13
labels: [epic, retrieva, cert, backend, domain-logic, dora]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## ⛔ BLOCKED — document-only
Implementation is blocked pending **(a) architecture + security review** and **(b) regulatory-reporting
approval**. **A4/A5 are release gates** — the formal RT.02.01 export must not change until regulatory
mapping + dry-run reconciliation + explicit owner cutover are approved. Design of record:
`retrieva-backend/docs/adr/0005-asset-service-reportability-classification.md`.

## Epic
As a **compliance owner**, I want Retrieva to tell apart an **internal ICT asset**, a **third-party ICT
service relationship**, the **contractual arrangement**, and its **regulatory reportability** — so the DORA
Register of Information contains the arrangements that actually qualify, with a reviewed, auditable
human determination, and self-hosted/licence-only tools are risk-assessed **without** being auto-registered.

## Why
Verified (2026-10-27): the evaluation→promotion path creates an arrangement unconditionally and the RoI
export emits every arrangement (incl. `prospect`) — over-registering non-service tools (the ESMA caveat).
This epic adds the **reviewed reportability determination** DORA requires. It sharpens Retrieva's
third-party-ICT graph; it does **not** make Retrieva a CMDB (asset inventory/SBOM stay in GLPI + scanners).

## Scope — four separated, non-exclusive concepts (ADR-0005)
- **ICT asset identity** → a CMDB reference (not a Retrieva inventory).
- **Third-party ICT service relationship** → classified (`none|licence_only|support_maintenance|managed_service|saas`).
- **Contractual arrangement** → the existing fact, created **only** for a qualifying relationship.
- **Reportability determination** → tri-state `pending_review|reportable|not_reportable` (+ `legacy_assumed_reportable`), reviewed by an authorized human.

## Stories
RTV-109 (schema) → RTV-110 (promotion branch), RTV-111 (determination API/authz) → RTV-112 (register split, gate) → RTV-113 (dry-run + cutover, gate); RTV-114 (tests) spans all.

## Definition of Done (epic)
All stories Done + the five scenario tests + export parity + backward-compat green; **A4/A5 gates cleared
with recorded approvals**; ADR-0005 as-built updated; the formal RT.02.01 export changes **only** after the
owner-approved cutover. Cert evidence: **BC02/BC03** (compliance-by-design).

## Out of scope
AI-native orchestration (Epic B / ADR-0006 — deferred); CMDB/SBOM rebuild; prod rollout; Vault provisioning.
