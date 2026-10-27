---
id: RTV-112-register-split-releasegate
title: "A4 — working register vs formal RT.02.01 export split (RELEASE GATE, no output change yet)"
status: Draft
type: Story
epic: reportability-model
milestone: "RTV — DORA RoI reportability (ADR-0005)"
estimate: 8
labels: [retrieva, cert, backend, dora, release-gate]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## ⛔⛔ RELEASE GATE — NOT a plain dev task. BLOCKED on regulatory mapping + cutover approval.
Changing which contractual arrangements appear in the **formal DORA RT.02.01 export** is a **controlled
regulatory-reporting change**, not an application feature. This story may build the *split* but **MUST NOT
change the formal export's output** until (a) the reporting criteria + field mapping are reviewed and
approved and (b) the RTV-113 dry-run + explicit owner cutover clear.

## Story
As a **compliance owner**, I want two distinct surfaces — an **internal working register** (everything the
firm tracks) and the **formal RT.02.01 export** (only reportable, contractual arrangements) — so internal
management and regulatory submission are not the same view, **without** altering today's regulatory output
until the change is explicitly approved.

## Dependencies
RTV-109 (schema) · RTV-111 (determination) · the **regulatory-mapping review** (blocking) · RTV-113 (cutover gate).

## Acceptance criteria
- **Internal working register** = all arrangements (incl. `prospect`, `pending_review`, `legacy_assumed_reportable`).
- **Formal RT.02.01 export** filters to `reportable` **and** the agreed contract-lifecycle rule — but this filter is **behind a cutover flag that DEFAULTS OFF**: pre-cutover the formal export is **byte-identical to today** (legacy-assumed included, prospects handled as now).
- Prospect exclusion + the reportable-filter activate **only** at the RTV-113 owner-approved cutover, after regulatory mapping sign-off.
- The split is covered by field-mapping documentation reviewed against RT.02.01 before any cutover.

## Tests
**Export parity** — formal export byte-identical to current pre-cutover (the key regression); working register diverges (shows more) immediately; post-cutover (test-only flag on) the formal export applies the reportable filter + prospect rule exactly as mapped.

## Migration implications
None (read-model/projection change). Reads RTV-109/111 state.

## Rollback
The cutover flag → OFF reverts the formal export to the current behavior instantly; no data change.

## Evidence required for completion (gate)
Export-parity proof (pre-cutover identical); the **regulatory field-mapping review sign-off**; the flag-off/flag-on diff; recorded approval to proceed to RTV-113. **No cutover without these.**
