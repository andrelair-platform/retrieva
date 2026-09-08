---
id: RTV-40-clause-mapping-eval
title: "Clause→control mapping + regression eval harness"
status: Ready
type: Story
epic: dora-tprm-domain
milestone: "RTV — DORA ICT-TPRM domain model"
estimate: 5
labels: [retrieva, cert, backend, ai, testing]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **compliance engineer**, I want extracted contract clauses mapped to the controls they affect, guarded by a regression eval, so that mapping quality can't silently degrade when the model or prompt changes.

## Background

Parent epic **RTV-29** (#500). ADR §4: reuse the phi3-financial / RTV-13 RAG-eval discipline for control mapping.

## Acceptance Criteria

- [ ] AC-1: Given extracted clauses (from ingestion), produce `clause → affected controls[]` using the library's `clause_match_patterns` + LLM assist.
- [ ] AC-2: Each mapping records the **clause span/citation** it came from (feeds RTV-41 evidence citations).
- [ ] AC-3: A **labelled eval set** (≥20 clause→control cases) with precision/recall metrics.
- [ ] AC-4: **CI gate**: the eval runs on model/prompt/library change; a regression below threshold fails CI.
- [ ] AC-5: Mapping traced in Langfuse (per `llmops.md`), cost-gated.

## Technical Notes

- Pattern-match first (cheap), LLM only for ambiguous clauses (noise-funnel discipline).
- Store the eval set in `tests/fixtures/`.

## Definition of Done
- [ ] ACs met; eval gate live in CI; Langfuse traces present
- [ ] Parent epic RTV-29 (#500) updated

## Dependencies
- Parent: #500 (RTV-29); Depends on RTV-39, RTV-14 (ingestion)
- Blocks: RTV-41
