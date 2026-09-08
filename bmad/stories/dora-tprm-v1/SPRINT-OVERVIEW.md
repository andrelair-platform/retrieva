# Retrieva — DORA ICT-TPRM v1 stories (RTV-28→30 broken down)

**Product / board:** Retrieva — RNCP39583 Certification (Project #2)
**Initiative:** Certification
**Home repo:** `retrieva`
**Reference:** `docs/architecture/dora-tprm-domain-model.md` (the canonical ADR)

Implementable stories for the three **foundation** epics (RTV-28 graph, RTV-29 control library,
RTV-30 assessment engine). Numbered RTV-36→RTV-43 (continues from the epic block RTV-28→35).
Each fits within one sprint and links to its parent epic.

## Story Tracker

| ID | Story | Parent epic | SP | Bloc |
|---|---|---|---|---|
| RTV-36 | Arrangement star schema (Arrangement + Provider + Entity + Function), group-ready | RTV-28 (#499) | 5 | BC02 |
| RTV-37 | Two-tier evidence model + immutable audit trail | RTV-28 (#499) | 5 | BC02 |
| RTV-38 | Register of Information projection/export (RT.02.01) from the graph | RTV-28 (#499) | 5 | BC02 |
| RTV-39 | Control Library data model + DORA seed (article→control→evidence→CIF) | RTV-29 (#500) | 5 | BC02 |
| RTV-40 | Clause→control mapping + regression eval harness | RTV-29 (#500) | 5 | BC02 |
| RTV-41 | Assessment engine core — evidence-grounded verdicts + citations | RTV-30 (#501) | 8 | BC02 |
| RTV-42 | Coverage scoring + evidence-coverage-based confidence | RTV-30 (#501) | 3 | BC02 |
| RTV-43 | Human-in-the-loop review → findings/risk + Langfuse tracing | RTV-30 (#501) | 5 | BC02 |

**Total:** 41 SP. All guardrails from the ADR §5 are baked into ACs.
