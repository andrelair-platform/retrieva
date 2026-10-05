---
id: RTV-75-feedback-dataset-eval-loop
title: "Close the learn-from-feedback loop: 👎 traces → Langfuse dataset → offline RAGAS experiment → gated promotion (reuse minicloud-rag-eval)"
status: Ready
type: Story
epic: dora-tprm-domain
estimate: 8
labels: [retrieva, cert, ai, llmops]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As the **owner of the Ask-AI assistant**, I want the thumbs-down answers harvested into a **curated evaluation dataset** and used to **experiment with prompt changes** before I ship them, so that real user feedback actually *improves the product* — a candidate prompt is promoted to production only when it beats the current one on the answers users disliked.

## Why — the payoff RTV-73 laid rails for

RTV-73 made every 👍/👎 a Langfuse `user_rating` score on the answer's trace + persisted `langfuse_trace_id`. That's the **signal**; nothing consumes it yet. The loop:

```
👎 rated traces  →  curated Langfuse DATASET  →  offline RAGAS EXPERIMENT (prompt A vs B)  →  gated PROMOTION (relabel)
```

## REUSE, don't rebuild — `minicloud-rag-eval` (do NOT reinvent this in TS)

The platform **already has a RAGAS-based eval framework**: `andrelair-platform/minicloud-rag-eval` ("Reusable RAG evaluation framework for the minicloud platform", `ragas>=0.2`). It provides exactly the scorer/experiment layer this story needs — **faithfulness, answer_relevancy, context_precision, context_recall** (`rag_eval/ragas_runner.py`), deterministic metrics (`metrics.py`), Langfuse score-posting (`langfuse_reporter.py`), and `offline | online | generate-dataset` modes (`cli.py`). An earlier draft of this story proposed building `harvestFeedbackDataset.ts` + `runPromptExperiment.ts` in `retrieva-backend` — **that is retired**: it would duplicate `minicloud-rag-eval`. This story instead adds a **Retrieva target** (an adapter) to that framework.

## Non-redundancy guardrails (MANDATORY — the point of this rewrite)

Retrieva already has eval surfaces; this story must not duplicate them:
- **Do NOT add online/live RAGAS faithfulness for Retrieva** — the runtime `services/rag/llmJudge.ts` already scores faithfulness/groundedness inline. This loop is **offline/batch only**.
- **Do NOT re-implement retrieval Recall@K/MRR** — `scripts/evaluate.js` already gates that deterministically in CI. RAGAS `context_precision/recall` are added **only** where curated ground-truth context exists, as an LLM-judged complement, not a replacement.
- The assessment-engine evals (`evaluateClauseMapping/Verdicts/RealDocs`) are a **different surface** (not chat RAG) — untouched.
- Net-new here (nothing else provides it): **answer_relevancy**, the **👎-harvested dataset**, and the **offline prompt A/B experiment**.

## Scope / Acceptance

- [ ] **Retrieva harvest target** in `minicloud-rag-eval` (new mode, e.g. `EVAL_MODE=harvest-negatives`): fetch Retrieva's Langfuse traces (tag `feature:rag-chat`) that carry a `user_rating` score ≤ 0 (the 👎), and upsert them as items into a Langfuse **dataset** `rag-chat-negatives`. Item `input` = question; `metadata` = {traceId, workspaceId, feedbackValue}; answer kept for review. **Idempotent** — skip trace ids already harvested. Points at **Retrieva's own Langfuse project** (per-product LLMOps standard), not the phi3 one.
- [ ] **Curation is human-in-the-loop** (Clause 3): items land without `expectedOutput`; a human sets the ideal answer / failure tag in the Langfuse UI. Never auto-rewrites prompts.
- [ ] **Offline experiment** = `minicloud-rag-eval` `offline` mode + `ragas_runner` over `rag-chat-negatives`, scoring **answer_relevancy + faithfulness (batch)** (+ context metrics only with ground-truth). Run for the current `production` prompt and the candidate (`latest`) on the **same** items; emit a candidate-vs-baseline diff.
- [ ] **Gated promotion** (RTV-14 governance): relabel a prompt `production` **only** when its experiment beats the production baseline on `rag-chat-negatives` and doesn't regress a golden set. The relabel stays the deliberate human step (`seedLangfusePrompts.ts` policy) — never auto-promote.
- [ ] **Runbook** in `retrieva/docs/` LLMOps section: harvest → curate → experiment → compare → relabel; plus how it reads RTV-73 scores and where Retrieva's `rag-eval` instance is configured/deployed.
- [ ] **Cost-aware:** harvest is metadata-only (cheap); experiments call the LLM per item → cap items/run and log what was sampled (no silent truncation).

## Suggested slices

1. **RTV-75a** — the Retrieva **harvest target** in `minicloud-rag-eval` + the `rag-chat-negatives` dataset (idempotent). *MVP: the dataset exists, built from real 👎.*
2. **RTV-75b** — the **offline RAGAS experiment** over the dataset (A/B candidate vs production).
3. **RTV-75c** — the **promotion gate** wired to `seedLangfusePrompts` label governance + runbook.

## Notes / design

- **Adapter boundary:** reusable as-is from `rag-eval` — `ragas_runner`, `metrics`, `langfuse_reporter` (REST helpers), the CLI/mode skeleton, the image/CronJob deploy. **Retrieva-specific to add** — a trace filter (tag + `user_rating ≤ 0`) + extractor for Retrieva's trace shape (input=question, output=answer; the `get_traces` list already includes each trace's `scores`), dataset-item upsert helpers, and Retrieva Langfuse env config. Retrieva's trace already carries question/answer/context, so RAGAS can often score **from the trace** without re-calling Retrieva's RAG.
- **On-demand first, scheduled later** (CronJob like the phi3 instance) once proven.
- Fits the AI-native SDLC eval model (`reference_ai_native_sdlc_harness`): RAGAS judge via LiteLLM, Claude-on-plan for the human read.

## Dependencies

- Reuses: **`minicloud-rag-eval`** (RAGAS framework), **RTV-73** (user_rating scores + trace ids — merged), **RTV-14** (Langfuse prompt label routing). Per-product LLMOps standard (`reference_per_product_llmops`). Evaluates the RAG that RTV-76's orchestrator also runs.
