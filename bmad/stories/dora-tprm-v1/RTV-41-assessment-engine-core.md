---
id: RTV-41-assessment-engine-core
title: "Assessment engine core — evidence-grounded verdicts + citations"
status: Ready
type: Story
epic: dora-tprm-domain
milestone: "RTV — DORA ICT-TPRM domain model"
estimate: 8
labels: [retrieva, cert, backend, ai, domain-logic]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As an **ICT risk analyst**, I want the engine to assess an arrangement against the applicable controls and return **cited, evidence-grounded** verdicts, so that the output is audit-defensible.

## Background

Parent epic **RTV-30** (#501). ADR §5 (the non-negotiable guardrails). Built on the shipped RAG + ingestion + clause-mapping (RTV-40).

## Acceptance Criteria

- [ ] AC-1: For an arrangement, resolve applicable controls (RTV-39, CIF-keyed) → for each, gather expected vs found evidence (RTV-37) → produce a verdict.
- [ ] AC-2: Verdict enum: **Compliant / Partial / Non-compliant / Insufficient-evidence / N-A**.
- [ ] AC-3: **Absence of expected evidence → "Insufficient-evidence" (human review), NEVER auto Non-compliant.**
- [ ] AC-4: Every verdict **cites the exact clause/evidence** used and lists **what was searched** (which documents), stamped with the **control-library version** (RTV-39).
- [ ] AC-5: Full Langfuse trace (nested: resolve-controls → gather-evidence → verdict generation with usage); cost-gated like RTV-14.
- [ ] AC-6: vitest: a seeded arrangement yields correct verdicts incl. an insufficient-evidence case with citations.

## Technical Notes

- Reuse RAG retrieval over the evidence set; the LLM justifies against retrieved spans, never free-floating.
- No score yet — that's RTV-42. This story = the per-control verdict + citation.

## Definition of Done
- [ ] ACs met; insufficient-evidence path proven; citations present; traces in Langfuse
- [ ] Parent epic RTV-30 (#501) updated

## Dependencies
- Parent: #501 (RTV-30); Depends on RTV-36, RTV-37, RTV-39, RTV-40
- Blocks: RTV-42, RTV-43
