---
id: RTV-75-feedback-dataset-eval-loop
title: "Close the learn-from-feedback loop: 👎 traces → Langfuse dataset → prompt eval/experiment → gated promotion"
status: Ready
type: Story
epic: dora-tprm-domain
estimate: 8
labels: [retrieva, cert, backend, ai, llmops]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As the **owner of the Ask-AI assistant**, I want the thumbs-down answers to be harvested into a **curated evaluation dataset** and used to **experiment with prompt changes** before I ship them, so that real user feedback actually *improves the product* — a candidate prompt is promoted to production only when it beats the current one on the answers users disliked.

## Why — this is the payoff RTV-73 laid rails for

RTV-73 made every 👍/👎 a Langfuse `user_rating` score on the answer's trace and persisted `langfuse_trace_id` on the message. That's the **signal**; it does nothing on its own. The learn-from-feedback loop is:

```
👎 rated traces  →  curated Langfuse DATASET  →  EXPERIMENT (prompt A vs B, scored)  →  gated PROMOTION (relabel)
```

The platform already has the two halves this connects: **Langfuse-managed, label-routed prompts** (seed → `latest`=dev → `production` via relabel, zero redeploy — `seedLangfusePrompts.ts`, RTV-14) and an **eval harness** (`scripts/evaluate*.js`). What's missing is the dataset + experiment layer in between (no `createDataset`/dataset-run usage exists yet). This story adds it — turning feedback into **measured** prompt improvement. Strong **BC04 (optimiser / MCO)** cert evidence: a documented, data-driven improvement loop, not vibes.

## Scope / Acceptance

- [ ] **Harvester** (`retrieva-backend/scripts/harvestFeedbackDataset.ts`): query Langfuse for traces tagged `feature:rag-chat` with a `user_rating` score ≤ 0 (negative) in a window, and upsert them as items into a Langfuse **dataset** (`rag-chat-negatives`). Item `input` = the user question (+ retrieved context/sources if available on the trace); `metadata` = {traceId, workspaceId, date}. **Idempotent** — skip trace ids already in the dataset. Log how many harvested/skipped.
- [ ] **Curation is human-in-the-loop** (Clause 3): items land with no `expectedOutput`; a human reviews them in the Langfuse UI and optionally sets the ideal answer and/or a failure tag (`hallucination` / `missing-context` / `wrong-refusal` / `style`). The loop never auto-rewrites prompts.
- [ ] **Experiment runner** (`scripts/runPromptExperiment.ts`): for a given prompt name + candidate version/label, run each dataset item through the RAG answer path using that prompt, score each output (reuse the existing **LLM-judge** eval approach from `scripts/evaluate*.js`; judge calls go via LiteLLM), and record a Langfuse **dataset run** (experiment) with per-item + aggregate scores (e.g. answer-faithfulness, context-use, resolves-the-complaint).
- [ ] **A/B on the same dataset**: run the experiment for both the current `production` prompt and the `latest`/candidate, so they're comparable on identical inputs. Emit a short diff summary (candidate vs baseline aggregate).
- [ ] **Gated promotion** (ties to RTV-14 governance): a prompt version is relabelled `production` **only** when its experiment **beats the production baseline on `rag-chat-negatives`** and does **not regress** a small golden/positive set. The gate is the decision input; the relabel stays the deliberate human step (as today — never auto-promote to prod).
- [ ] **Docs**: a short runbook in `retrieva/docs/docs/` (LLMOps section) — harvest → curate → experiment → compare → relabel — plus how it reads RTV-73 scores.
- [ ] **Cost-aware**: harvesting is metadata-only (cheap); experiments call the LLM per item, so cap dataset size per run and `log()` what was sampled (no silent truncation).

## Suggested slices (sub-stories)

1. **RTV-75a** — harvester + the `rag-chat-negatives` dataset (MVP: the data exists + is idempotent).
2. **RTV-75b** — experiment runner + LLM-judge scoring → a Langfuse dataset run.
3. **RTV-75c** — A/B compare + the promotion gate wired into the `seedLangfusePrompts` label governance + runbook.

## Notes / design

- **Reuse, don't rebuild:** the judge + scoring come from `scripts/evaluate*.js`; prompt fetch/label routing from `config/tracing.ts` `getLangfusePrompt` + `seedLangfusePrompts.ts`; the signal from RTV-73 (`user_rating` scores + `langfuse_trace_id`). This story is the glue (dataset + experiment), which is genuinely new (no `dataset`/experiment API usage in the repo today — confirm the Langfuse core SDK surface first; a short spike may precede 75b).
- **On-demand first, scheduled later:** run the harvester manually to start; a cron/n8n schedule (or the `minicloud-ops sdlc_loop` pattern) is a follow-up once the loop is proven.
- **Fits the AI-native SDLC eval model** (`reference_ai_native_sdlc_harness`): deterministic where possible, LLM-judge via LiteLLM, Claude-on-plan for the human read of results.

## Dependencies

- Depends on: **RTV-73** (user_rating scores + message trace ids — merged), **RTV-14** (Langfuse prompt management + label routing), the `scripts/evaluate*.js` harness. Relates to the per-product LLMOps standard (`reference_per_product_llmops`).
