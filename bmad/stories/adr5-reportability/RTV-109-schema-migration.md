---
id: RTV-109-schema-migration
title: "A1 — schema + additive migration: service relationship, reportability tri-state, CMDB asset-ref"
status: Draft
type: Story
epic: reportability-model
milestone: "RTV — DORA RoI reportability (ADR-0005)"
estimate: 8
labels: [retrieva, cert, backend, database, dora]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## ⛔ BLOCKED — implementation gated on architecture + security review. Document-only.

## Story
As a **platform engineer**, I want the data model to represent **ICT asset identity**, a **third-party ICT
service relationship**, and a **reviewed reportability determination** as **separate, non-exclusive**
concepts — added **additively** so no existing arrangement, evaluation, or audit row changes — so the later
stories have a foundation and today's RoI export is byte-unchanged.

## Dependencies
ADR-0005 (Accepted) · the architecture + security review (blocking). No code dependency on other A-stories.

## Acceptance criteria
- New objects are **additive** (new table(s)/column(s)); **no** column drop/rename on `arrangements`/`evaluations`/`users`; existing rows untouched.
- A **service-relationship** concept (classification `none|licence_only|support_maintenance|managed_service|saas`) distinct from the arrangement.
- A **reportability determination** with the tri-state `pending_review|reportable|not_reportable` **plus** a distinct `legacy_assumed_reportable` state — the legacy state is **not** equal to a human-confirmed `reportable`.
- An **ICT asset reference** = CMDB id/url + a minimal cached descriptor (name/type/owner); **not** a rebuilt inventory.
- Backfill: every existing arrangement → `legacy_assumed_reportable` (never auto `reportable`); `action_audit` + all history preserved.
- ERD regenerated (tbls) on **x86** (arm leaks `aarch64` → false drift).

## Tests
Migration up + down; backfill sets `legacy_assumed_reportable` (asserts NOT `reportable`); **export parity** (RT.02.01 byte-identical pre/post migration); rollback drops the additive objects with zero data loss; history/audit rows intact.

## Migration implications
Additive DDL + a data backfill only; no destructive change. drizzle-kit migration; `legacy_assumed_reportable` as a bootstrap classification; ERD drift-check must pass (x86).

## Rollback
Additive objects are droppable; backfill is reversible (a single bootstrap state); no legacy arrangement is mutated → rollback restores the exact prior model + export.

## Evidence required for completion
Migration diff + the regenerated ERD; a before/after row-count table; an export-parity proof (RT.02.01 identical pre/post); confirmation legacy rows are `legacy_assumed_reportable`, not `reportable`.
