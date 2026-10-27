# Sprint — DORA RoI reportability model (ADR-0005), Epic A

**Project:** Retrieva (RNCP39583, board #2) · **Initiative:** Certification · **Milestone:** `RTV — DORA RoI reportability (ADR-0005)`
**Design of record:** `retrieva-backend/docs/adr/0005-asset-service-reportability-classification.md` (Accepted 2026-10-27).

## ⛔ Epic A is BLOCKED (document-only)
Implementation is **blocked pending (a) an architecture + security review and (b) regulatory-reporting
approval**. These stories are the *plan*; **no schema/migration/runtime change** is authorized by this
sprint. **A4 and A5 are RELEASE GATES, not dev tasks** — the formal DORA RT.02.01 export must NOT change
output until regulatory mapping + a dry-run reconciliation + an explicit owner cutover are approved.

## Why
Verified investigation (2026-10-27): `selectWinner → confirmProposal` creates an arrangement
unconditionally and `buildRegister` exports **every** arrangement (incl. `prospect`) to RT.02.01 — no
asset-vs-service or reportability concept exists. That over-registers self-hosted/licence-only tools (the
ESMA caveat: a licence without ongoing ICT services ≠ a third-party ICT provider). This epic adds the
**reviewed reportability determination** DORA requires, without turning Retrieva into a CMDB.

## Hard constraints (apply to every story)
1. Migrations **additive**; preserve all historical records + audit attribution.
2. ICT asset and third-party ICT service relationship are **non-exclusive** (a solution can be both).
3. Distinguish `pending_review | reportable | not_reportable` **and** `legacy_assumed_reportable` — **never** silently convert legacy → human-approved.
4. Reportability decisions = **authorized humans only**, full audit evidence, SoD (SERVICE principals excluded; proposer ≠ approver).
5. Separate the **internal working register** from the **formal regulatory export**.
6. Do **not** alter the formal RT.02.01 export or exclude prospects until reporting criteria + mapping + cutover are explicitly reviewed (A4/A5 gates).
7. A **dry-run reconciliation** must show row-level diffs between existing and proposed exports before any cutover.
8. Tests cover: the 5 classification scenarios, mixed asset/service, tenant isolation, authorization, export parity, historical records, rollback.

## Stories
| ID | Story | Type | Gate |
|---|---|---|---|
| RTV-108 | Epic — asset/service/reportability model (ADR-0005) | Epic | blocked |
| RTV-109 | A1 — schema + additive migration (`legacy_assumed_reportable`) | Story | arch/sec review |
| RTV-110 | A2 — promotion branching (non-exclusive asset + service) | Story | arch/sec review |
| RTV-111 | A3 — determination API + authz (human-only, SoD, audited) | Story | arch/sec review |
| RTV-112 | A4 — register split (working vs formal) — **RELEASE GATE** | Story | regulatory mapping + cutover |
| RTV-113 | A5 — dry-run reconciliation + owner cutover — **RELEASE GATE** | Story | owner cutover approval |
| RTV-114 | A6 — test suite (scenarios + parity + rollback) | Story | — |

## Dependency order
RTV-109 → RTV-110, RTV-111 → RTV-112 → RTV-113 ; RTV-114 spans all. A4/A5 do not ship output changes until their gates clear.

## Epic B (ADR-0006, AI-native orchestration) — SEPARATE, DEFERRED
Not started. Do not begin autonomous-agent work until Epic A establishes reliable, tested determination +
approval boundaries. Agents may discover/extract/classify/recommend only; humans own regulated determinations.
