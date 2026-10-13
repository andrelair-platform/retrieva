# Retrieva — Agentic Assessment (deterministic supervisor + CrewAI crew over A2A)

**Product / board:** Retrieva — RNCP39583 Certification (Project #2)
**Initiative:** Certification
**Home repo:** `retrieva` · **New member repo:** `retrieva-assessment-crew` (Python)
**Type:** Sprint backlog (Path A reconciliation of RTV-76)
**SDD:** `retrieva/docs/docs/architecture/agentic-assessment-orchestrator.md`

---

## The model (one line)

**A deterministic LangGraph-JS supervisor (in `retrieva-backend`, RTV-76 unchanged) sequences the
existing specialist services and, at the assessment node, delegates to a collaborative CrewAI crew
over A2A — every verdict human-gated through the existing `decisionQueue`.** All four requested
frameworks (LangChain · LangGraph · CrewAI · A2A) are used; autonomy is confined to one node whose
output a human must approve.

## Why this shape (Path A — see ADR-AGENT-01)

RTV-76 deliberately chose **deterministic routing + human gates + single runtime** because that is
what makes Retrieva **defensible under DORA + EU AI-Act** (not a GPT wrapper). Path A keeps that spine
and adds genuine agent collaboration **only** where it is safe (the clause→control→gap→score
sub-task, bounded, human-gated). The alternative (a full autonomous Python brain, Path B) would put
autonomy on the critical path of a compliance verdict and weaken the certification thesis. CrewAI is a
hard requirement → it lives in a small, stateless, scale-to-zero Python service reached over A2A.

## Scope decisions (deliberate, not gaps)

- **No autonomous swarm, no LLM-chosen routing, no ReAct/`bindTools`** — RTV-76 hard constraints kept
  (retrieva already removed a ReAct agent, #439).
- **Crew holds no DB credentials** and persists nothing; authoritative writes happen in the backend
  **after** a human gate.
- **A2A is cluster-internal only** (no Ingress) for v1.
- **One objective** (vendor onboarding → assessment). Periodic-reassessment orchestration is deferred.

## Project Governance (per `project-governance.md`)

**Project card:** Agentic Assessment Orchestrator · Board #2 · Phase P2→P4 · target: v1 cert demo.

**Active roles:** SA/TL (AndreLiar), BE (supervisor + A2A), BE/AI (CrewAI crew), DBA (run/checkpoint
schema), DO (crew wrapper-chart + Kargo + netpol), SEC (threat model + A2A gate), QA (live-dev gate),
PM/STK (compliance owner acceptance).

**RACI (P1–P6):**

| Phase | STK | PM | SA/TL | BE | DBA | DO | SEC | QA |
|---|---|---|---|---|---|---|---|---|
| P1 Requirements | A | R | C | I | I | I | C | I |
| P2 Architecture/SDD | C | C | **R/A** | C | C | C | C | I |
| P3 Development (supervisor + crew + A2A) | I | I | A | **R** | C | I | C | I |
| P4 Infra/CI-CD (wrapper-chart, Kargo, netpol) | I | I | C | C | I | **R/A** | C | I |
| P5 Testing/Security (L2/L3/L4 + threat model) | I | I | C | R | I | I | **C** | **R/A** |
| P6 Release/Ops (QA gate → prod, runbook) | I | A | C | R | I | R | C | R |

**Out of scope (justified):** UX/UI (reuses the existing decisionQueue surface) · SRE on-call (dev/cert
stage, not 24×7) · SUP/helpdesk (no external users yet).

## Epic Tracker

| ID | Story | Type | Est | v1? |
|---|---|---|---|---|
| RTV-77 | **Epic** — agentic assessment: deterministic supervisor + CrewAI crew over A2A (human-gated) | Epic | 13 | ✅ |
| RTV-78 | Deterministic LangGraph-JS supervisor `StateGraph` (intake→gap→findings, 1 gate, checkpointer, `assessment_run`) | Story | 5 | ✅ (MVP spine) |
| RTV-79 | A2A contract — Agent Card + `assess-arrangement` task schema (contract-first) + L3 contract test | Story | 3 | ✅ |
| RTV-80 | `retrieva-assessment-crew` Python service scaffold (CrewAI + LangChain + LiteLLM + A2A server; wrapper-chart + Kargo git-Warehouse; Langfuse-only) | Story | 5 | ✅ |
| RTV-81 | CrewAI assessment crew impl (clause-mapper → gap-analyst → control-scorer; evidence-grounded, insufficient-evidence default) | Story | 8 | ✅ |
| RTV-82 | HITL wiring — `interrupt()` ⇄ `decisionQueue` ⇄ socket.io "waiting on you" + ownership-scoped resume | Story | 5 | ✅ |
| RTV-83 | Observability + **LangSmith retirement** (Langfuse-only) + RTV-75 eval hook — **retirement ✅ already on `main` (PR #94)**, done via a Langfuse callback handler; only the eval hook remains | Story | 3 | ✅ |

## Sequencing

1. ~~**RTV-83 first** — retire LangSmith~~ → **already shipped on `main` (PR #94)**; the new service inherits Langfuse-only. Only RTV-83's eval-hook item remains, deferred until the orchestrator exists. **Start real work at RTV-78.**
2. **RTV-78 → RTV-79** — prove the deterministic spine + nail the A2A contract (contract-first, so the
   TS and Python sides build in parallel).
3. **RTV-80 → RTV-81** — stand up the Python crew behind A2A, then the real collaboration.
4. **RTV-82** — wire the human gates end-to-end; the "waiting on you" surface.
5. **Gate to prod:** full Tier-A test layers (L2/L3/L4) + the live-dev QA gate (`qa-gate.md`) before the
   CODEOWNERS prod PR.

## Dependencies

Reuses RTV-34 (intake), RTV-72 (sub-provider extraction), the assessment engine (`assessArrangement`),
RTV-55 (maker/checker SoD), RTV-38 (register projection); evaluated by RTV-75. New deps:
`@langchain/langgraph` (+ Postgres checkpointer, TS side); `crewai` + an A2A server lib (Python side).
