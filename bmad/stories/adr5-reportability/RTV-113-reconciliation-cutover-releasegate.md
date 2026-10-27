---
id: RTV-113-reconciliation-cutover-releasegate
title: "A5 — dry-run reconciliation (row-level diff) + owner cutover gate (RELEASE GATE)"
status: Draft
type: Story
epic: reportability-model
milestone: "RTV — DORA RoI reportability (ADR-0005)"
estimate: 5
labels: [retrieva, cert, backend, dora, release-gate]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## ⛔⛔ RELEASE GATE — the controlled cutover for the formal DORA export. BLOCKED on owner approval.

## Story
As a **compliance owner**, before the formal RT.02.01 export ever changes, I want a **dry-run that shows
the exact row-level differences** between the current export and the proposed one — which arrangements
would be **added, removed, or reclassified** — plus the list of `legacy_assumed_reportable` / `pending_review`
items still needing a human determination, so I can **explicitly approve the cutover** with full sight of
its regulatory impact (nothing changes silently).

## Dependencies
RTV-109 · RTV-111 · RTV-112 (the split, flag-off). This story owns the **cutover switch**.

## Acceptance criteria
- A **dry-run reconciliation** report: per-arrangement **added / removed / reclassified** between current and proposed RT.02.01, with the reason (determination state) for each delta.
- A **completeness view** of all `legacy_assumed_reportable` + `pending_review` items (the human-review backlog), reusing the existing completeness engine.
- The formal export **cannot change** without an explicit, **recorded owner cutover approval** taken **after** reviewing the dry-run; the cutover is reversible (RTV-112 flag).
- Time-boxed reconciliation window; the unreconciled count is a surfaced metric (not a hard 100% block).

## Tests
Dry-run diff correctness (seeded deltas → expected add/remove/reclassify rows); cutover is gated (no output change without the approval flag); post-approval the export matches the dry-run's "proposed" exactly; rollback (flag off) returns to current.

## Migration implications
None (reporting/projection + a flag). Reads prior stories' state.

## Rollback
Cutover flag OFF → formal export reverts to current; the dry-run is read-only and side-effect-free.

## Evidence required for completion (gate)
The row-level dry-run artifact; the human-review backlog list; the **recorded owner cutover approval**; a post-cutover export matching the approved "proposed" set. **No cutover without the recorded approval.**
