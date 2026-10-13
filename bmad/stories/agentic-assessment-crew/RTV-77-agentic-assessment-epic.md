---
id: RTV-77-agentic-assessment-epic
title: "Agentic assessment: deterministic LangGraph supervisor + CrewAI crew over A2A (human-gated)"
status: Ready
type: Epic
epic: agentic-assessment
estimate: 13
labels: [epic, retrieva, cert, backend, ai, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Epic

As a **compliance owner**, I want a single **"assess this vendor for DORA"** action where a **team of
specialist agents collaborates** on the hard clause→control→gap→score reasoning while a **deterministic
supervisor** sequences the pipeline and **pauses for my approval at every decision** — so assessments
assemble themselves with evidence, and I stay accountable for every verdict.

## Why

RTV-76 committed the orchestrator as a **deterministic LangGraph `StateGraph`** (no autonomous swarm,
no LLM routing, human-gated) because that is what makes Retrieva **defensible under DORA + EU AI-Act**.
This epic adds genuine **multi-agent collaboration** (the hard requirement: LangChain + LangGraph +
**CrewAI** + **A2A**, human-in-the-loop) **without** spending that defensibility — by confining autonomy
to **one node** (the assessment crew) whose output is **human-gated**. Strong **Bloc 2 (concevoir &
développer)** + **Bloc 4 (MCO)** cert evidence: a documented, human-accountable, evaluable agent pipeline.

**Substrate = Path A (see ADR-AGENT-01, SDD §0).** Supervisor stays **LangGraph-JS, in-process,
deterministic** (RTV-76 unchanged); the assessment node delegates to a **CrewAI crew** in a new,
stateless, scale-to-zero Python service **`retrieva-assessment-crew`** over **A2A**.

## Hard constraints (non-negotiable, inherited from RTV-76)

- **Deterministic routing only** — edges conditional on *data*, never an LLM; **no ReAct / `bindTools`** (#439).
- **Human gate before any authoritative write** — findings stay `draft`, edges `confirmed:false` until approved.
- **Halt-on-doubt** — a failed/low-confidence node leaves the run `blocked`; no silent auto-advance.
- **Crew is stateless, holds no DB creds, persists nothing**; A2A is **cluster-internal only**.

## Scope / Acceptance (epic-level)

- [ ] Deterministic supervisor `StateGraph` in `retrieva-backend` wrapping existing services as nodes (RTV-78).
- [ ] A2A contract + Agent Card for `assess-arrangement`, L3 contract-tested both directions (RTV-79).
- [ ] `retrieva-assessment-crew` Python service (CrewAI + LangChain + LiteLLM), deployed via wrapper-chart + Kargo (RTV-80).
- [ ] CrewAI crew (clause-mapper → gap-analyst → control-scorer), evidence-grounded, insufficient-evidence default (RTV-81).
- [ ] HITL via `interrupt()` ⇄ `decisionQueue` ⇄ socket.io + ownership-scoped resume (RTV-82).
- [ ] Langfuse-only observability (LangSmith retired) + the RTV-75 eval hook scores a full run (RTV-83).
- [ ] **No regression** — every specialist service still works standalone; orchestrator is additive.
- [ ] Tier-A test layers **L2/L3/L4** + the live-dev **QA gate** pass before the prod-promotion PR.

## Explicit non-goals

- No autonomous multi-agent swarm, no peer-to-peer chatter, **no LLM-chosen routing**.
- Not a full Python `retrieva-agents` brain (Path B rejected — keeps autonomy off the verdict critical path).
- One objective (onboarding → assessment); periodic-reassessment orchestration is a future story.
- No public A2A exposure; the crew Agent Card is internal-only.

## Dependencies

Reuses RTV-34, RTV-72, assessment engine (`assessArrangement`), RTV-55 (SoD), RTV-38 (register), RTV-70
(questionnaire); evaluated by RTV-75. New: `@langchain/langgraph` (TS) + `crewai` & A2A server (Python).
