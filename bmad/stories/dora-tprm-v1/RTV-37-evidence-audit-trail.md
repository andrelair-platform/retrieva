---
id: RTV-37-evidence-audit-trail
title: "Two-tier evidence model + immutable audit trail"
status: Ready
type: Story
epic: dora-tprm-domain
milestone: "RTV — DORA ICT-TPRM domain model"
estimate: 5
labels: [retrieva, cert, backend, database, security]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **compliance owner**, I want evidence split into provider-global vs arrangement-local, with an immutable audit trail, so that provider assessments are reused across the group and every decision is attributable.

## Background

Parent epic **RTV-28** (#499). ADR §3 + §5: provider evidence (ISO/SOC/BCP/subprocessor list) is shared; arrangement evidence (contract/usage/exit/risk-acceptance) is local. Auditability is non-negotiable.

## Acceptance Criteria

- [ ] AC-1: `Evidence` model with `scope: provider|arrangement`, and fields `document, version, source, date, provider, service, validity, hash`.
- [ ] AC-2: **Provider-scoped** evidence links to a `Provider` and is resolvable from any of its arrangements (shared/inherited); **arrangement-scoped** evidence links to one `Arrangement` (entity-private).
- [ ] AC-3: Content `hash` computed on ingest; duplicate detection by hash.
- [ ] AC-4: **Immutable `AuditLog`**: append-only record of every state-changing action (actor, action, target, evidence refs, timestamp) — no update/delete path.
- [ ] AC-5: vitest: provider evidence visible across ≥2 arrangements; arrangement evidence not cross-visible; audit entries immutable.

## Technical Notes

- Reuse the multimodal ingestion (RTV-14) pipeline for document intake; this story adds the *model + scoping + audit*, not new parsing.
- Group visibility rules (who-sees-what across entities) are RTV-35 — here just the scope field.

## Definition of Done
- [ ] ACs met; vitest green; audit entries provably append-only
- [ ] Parent epic RTV-28 (#499) updated

## Dependencies
- Parent: #499 (RTV-28); Depends on RTV-36
- Blocks: RTV-41
