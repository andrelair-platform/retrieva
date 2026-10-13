---
id: RTV-83-observability-langsmith-retirement
title: "Observability: retire LangSmith (Langfuse-only) + RTV-75 eval hook scores a full run"
status: In Progress
type: Story
epic: agentic-assessment
estimate: 3
labels: [retrieva, cert, backend, ai, testing]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

> **⚠️ The LangSmith-retirement half is ALREADY DELIVERED on `main` by PR #94**
> (`refactor(observability): drop langsmith, langfuse as the single llmops backbone`). `main` went
> **further** than this story specified: instead of making `getCallbacks()` a no-op `[]`, it added a
> **Langfuse LangChain callback handler** — a drop-in replacement so chains invoked with
> `callbacks: getCallbacks(...)` are still callback-traced, now routed to Langfuse. The direct
> `langsmith` dep is gone; the transitive one (via `@langchain/core`) remains. **No further backend
> code is needed for the retirement.** This story stays **In Progress** only for its *forward-looking*
> items — the RTV-75 eval hook + ensuring the new crew service (RTV-80) ships Langfuse-only — which
> depend on the orchestrator (RTV-78+) existing. Retained as the planning/traceability record.

## Story

As the **platform**, I want **Langfuse to be the single LLMOps backbone** — the dormant LangSmith
integration removed — and a **completed agentic run to be one Langfuse trace the RTV-75 eval harness can
score end-to-end**, so observability is consistent and the pipeline is measurable (Bloc 4 evidence).

## Context / constraints

- Per the platform standard, **Langfuse is the backbone**; LangSmith was meant to be dropped but a
  disabled dual-backend path lingers in `retrieva-backend/config/tracing.ts` + an explicit dep.
- The **transitive** `langsmith` (a peer dep of `langchain`/`@langchain/core`) stays — only the **direct**
  integration + dep are removed. Do **sequence this first** so the new crew service is Langfuse-only.

## Acceptance

- [ ] `"langsmith"` removed from `retrieva-backend/package.json` **dependencies** (transitive copy remains).
- [ ] `config/tracing.ts`: delete the LangSmith branch — the `Client` import, `LANGSMITH_*` env,
      `isLangSmithEnabled()`, the LangSmith path in `getCallbacks()` and in `logFeedback()`.
      `getCallbacks()` returns `[]` (Langfuse traces are built manually via `startTrace`, unchanged).
- [ ] `LANGSMITH_*` scrubbed from `.env.example` (+ any `.env.*.example`).
- [ ] Callers unaffected — `getCallbacks`/`logFeedback`/`startTrace` signatures unchanged; `typecheck` + tests green.
- [ ] The **new crew service (RTV-80) ships Langfuse-only** (no LangSmith ever introduced).
- [ ] **RTV-75 eval hook** — a completed run's single Langfuse trace is scored end-to-end by the harness.
- [ ] L0/L1 green; docs (`architecture/prompt-management.md` / tracing notes) updated to Langfuse-only.

## Out of scope

Changing Langfuse trace structure; the crew reasoning (RTV-81); new eval metrics (RTV-75 owns those).
