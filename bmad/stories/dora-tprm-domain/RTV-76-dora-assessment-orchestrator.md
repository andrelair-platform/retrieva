---
id: RTV-76-dora-assessment-orchestrator
title: "DORA assessment orchestrator: a deterministic LangGraph StateGraph sequencing the specialist agents (human-gated)"
status: Ready
type: Epic
epic: dora-tprm-domain
estimate: 13
labels: [epic, retrieva, cert, backend, ai, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Epic

As a **compliance owner**, I want a single **"assess this vendor for DORA"** action that runs the whole chain — intake → classify → sub-provider extraction → gap analysis/assessment → risk → register → residual questionnaire → a cited dossier — by **orchestrating the specialist agents we already have**, pausing at the same maker/checker gates I use today, so the graph populates and the assessment assembles itself while a human stays accountable for every decision.

## Why

The platform has well-scoped specialist agents (RAG chat, `gapAnalysisAgent`, the assessment engine, contract intake, sub-provider extraction (RTV-72), questionnaire scorer, concentration) — but a human clicks through them one at a time. The value is an **orchestrator that sequences them toward one objective**, carrying the arrangement-graph state and stopping at human gates. It makes onboarding one action, lets the graph build itself end-to-end, and produces a **single auditable run** per vendor — which is also a clean eval target for the RTV-75 harness. Strong **BC02 (concevoir)** + **BC04 (optimiser)** cert evidence: a documented, data-driven, human-gated assessment pipeline.

## Substrate decision — deterministic LangGraph StateGraph (NOT an autonomous agent)

- **LangGraph-JS (`@langchain/langgraph`), in-process in `retrieva-backend`.** Chosen over Temporal: retrieva is already on **LangChain v1** (no new deps family), it needs **no new infra** (retrieva uses BullMQ, not Temporal), and a graph orchestrator fits the product. Temporal was considered and rejected for a *first* orchestrator on infra-cost grounds; revisit only if in-process durability proves insufficient.
- **Deterministic `StateGraph`** — nodes are the existing specialist **services**; edges are **conditional on data** (e.g. "critical tier → require committee gate"), never an LLM deciding routing. The LLM lives *inside* the existing specialist steps, not in the router.
- **⚠️ Do NOT build a ReAct / tool-calling agent.** retrieva already tried a LangGraph ReAct agent and **removed it (#439)** — the Ollama `analysis` model has no `bindTools()`. A StateGraph that calls services directly needs no `bindTools`, sidestepping that failure entirely. This is a hard constraint, not a preference.
- **Durability + audit (what replaces Temporal's history):** a **Postgres checkpointer** (resumable, survives pod restarts) + a persisted `assessment_run` record + **one Langfuse trace per run** (nested spans per node), so every run is replayable and auditable.
- **Human-in-the-loop:** LangGraph **`interrupt()`** at each maker/checker gate; the graph suspends, a human acts in the UI, a resume signal continues it. The orchestrator **proposes**; the human **confirms** (Clause 3) — same SoD you already enforce.

## The graph (objective = vendor onboarding → assessment)

```
intake (contract/evidence parse) ──► classify (tier/appetite)
   └► [interrupt: confirm proposed arrangement]        (RTV-34 intake)
sub-provider extraction ──► [interrupt: confirm nth-party edges]   (RTV-72, edges stay UNCONFIRMED until confirmed)
gap analysis + assessment engine (assessArrangement) ──► findings/verdicts
   └► [interrupt: maker/checker approve findings]        (assessmentEngine.assessArrangement; RTV-55 SoD)
risk register ──► register-of-information projection
residual questionnaire ONLY for uncovered gaps          (RTV-70 document-first → fallback)
   └► assemble cited "assessment dossier" ──► [interrupt: final sign-off]
```

Each node wraps an **existing** entry point (reuse, don't rebuild): `arrangementIntakeService`/`contractExtractionService`, `extractSubProvidersForWorkspace` (RTV-72), `assessmentEngine.assessArrangement`, the risk + `registerProjection` services, the questionnaire service.

## Scope / Acceptance (epic-level)

- [ ] **Deterministic StateGraph** in `retrieva-backend` wrapping the existing services as nodes; conditional edges on data; **no tool-calling/ReAct** (lint/review guard that nodes don't `bindTools`).
- [ ] **Run state** — an `assessment_run` table (arrangementId, status, current node, checkpointer ref, created/updated) + a Langfuse trace per run.
- [ ] **Durability** — Postgres checkpointer; a killed/restarted run resumes from the last completed node, not from scratch.
- [ ] **Human gates via `interrupt()`** at: confirm arrangement, confirm nth-party edges, approve findings (maker/checker SoD), final sign-off. Resume via an authenticated, ownership-scoped API; the UI surfaces "waiting on you" runs.
- [ ] **Halt / low-confidence handling (compensation):** if a node fails or returns low confidence, the run **halts in a `blocked` state** and surfaces to a human — it never advances on a bad step, and **nothing partial becomes authoritative** (extracted edges stay `confirmed:false`, findings stay `draft`, no register/questionnaire emitted). No silent auto-advance.
- [ ] **Dossier output** — a cited assessment dossier (findings + verdicts + citations + the register projection) for the final sign-off gate.
- [ ] **Evaluable** — a completed run is a single trace the RTV-75 harness can score end-to-end.
- [ ] **No regression** — every specialist service still works standalone (the orchestrator is additive; it calls them, doesn't replace their routes).

## Suggested slices (sub-stories)

1. **RTV-76a — thin slice / proving ground (MVP):** `intake → gap analysis → findings` as a StateGraph with **one** `interrupt()` gate + the Postgres checkpointer + the `assessment_run` record + Langfuse trace. Proves the pattern end-to-end on the smallest useful chain.
2. **RTV-76b — extend the chain:** add classify/appetite, sub-provider extraction (RTV-72), risk, register projection, with their SoD gates + halt rules.
3. **RTV-76c — residual questionnaire + dossier + final sign-off**, and the "waiting on you" runs surface in the UI.

## Explicit non-goals

- **No autonomous multi-agent swarm**, no peer-to-peer agent chatter, no LLM-chosen routing. Deterministic graph only.
- **Not** wiring the *platform research agents* (`minicloud-agent`, `minicloud-crew-agent`) into this — different domain; collaboration is scoped to the Retrieva DORA specialists only.
- One orchestrator for one objective (vendor onboarding→assessment). A second objective (periodic reassessment — triggers already exist) is a *future* story, not this one.

## Dependencies

- Reuses: RTV-34 (intake), RTV-72 (sub-provider extraction), the assessment engine (`assessArrangement`), RTV-55 (maker/checker SoD), RTV-70 (residual questionnaire), RTV-38 (register projection). Evaluated by RTV-75. New dep: `@langchain/langgraph` (+ its Postgres checkpointer).
