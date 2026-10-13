---
id: RTV-78-deterministic-supervisor-stategraph
title: "Deterministic LangGraph-JS supervisor StateGraph (intake→gap→findings, one human gate, Postgres checkpointer)"
status: Ready
type: Story
epic: agentic-assessment
estimate: 5
labels: [retrieva, cert, backend, ai, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As the **platform**, I want a **deterministic LangGraph-JS `StateGraph`** in `retrieva-backend` that
sequences the existing specialist services as nodes — proving the thin slice **intake → gap analysis →
findings** with **one `interrupt()` gate**, a **Postgres checkpointer**, and an **`assessment_run`**
record — so the orchestrator pattern is proven end-to-end before the crew and the remaining nodes are added.

## Context / constraints

- **`@langchain/langgraph` + its Postgres checkpointer** (new TS dep). In-process in `retrieva-backend` (RTV-76).
- **Deterministic** `StateGraph` — nodes call existing **services** directly; edges conditional on *data*.
  **No `bindTools`, no ReAct** (hard constraint; #439).
- Nodes reuse existing entry points: `arrangementIntakeService` / `contractExtractionService`,
  `gapAnalysisAgent` / `assessmentEngine.assessArrangement`.
- The assessment node is a **stub** here (returns a placeholder) — RTV-81 fills it via A2A (RTV-79/80).

## Acceptance

- [ ] `StateGraph` with nodes `intake → gap → findings` and a conditional edge on arrangement data.
- [ ] One `interrupt()` gate (confirm arrangement) suspends the graph; state persisted to the checkpointer.
- [ ] `assessment_run` table (Drizzle migration): `id, arrangement_id, status, current_node,
      langfuse_trace_id, created_at, updated_at` — statuses `running|blocked|waiting_human|done`.
- [ ] **Durability** — a killed/restarted process resumes the run from the **last completed node**, not from scratch.
- [ ] **Halt-on-doubt** — a node error or low confidence sets `status=blocked`; nothing partial becomes authoritative.
- [ ] One **Langfuse** trace per run, nested spans per node (via `startTrace`).
- [ ] **L2** integration test against a real Postgres: run → interrupt → resume → done; and run → kill → resume.
- [ ] No regression: the wrapped services still work on their existing routes.

## Out of scope

The CrewAI crew / A2A (RTV-79/80/81), the full node chain (classify/sub-provider/register/dossier — a
later slice), the "waiting on you" UI (RTV-82).
