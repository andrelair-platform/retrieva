---
id: RTV-42-coverage-scoring
title: "Coverage scoring + evidence-coverage-based confidence"
status: Ready
type: Story
epic: dora-tprm-domain
milestone: "RTV — DORA ICT-TPRM domain model"
estimate: 3
labels: [retrieva, cert, backend, domain-logic]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **compliance officer**, I want an arrangement's result expressed as **control/evidence coverage** (not "% compliant") with a **confidence grounded in evidence**, so that the number is honest and legally safe.

## Background

Parent epic **RTV-30** (#501). ADR §5: "coverage, never % compliant"; confidence from evidence coverage, not raw LLM self-report.

## Acceptance Criteria

- [ ] AC-1: Aggregate per-control verdicts into a **coverage** metric (e.g. controls with sufficient evidence / applicable controls), explicitly labelled **"control/evidence coverage"** — the word "compliant/compliance %" must not appear in the metric label.
- [ ] AC-2: **Confidence** derived from evidence coverage signals (expected doc types found? corroborating clauses? recency/validity?) — NOT the LLM's self-reported probability.
- [ ] AC-3: Insufficient-evidence controls reduce coverage (they are not counted as pass).
- [ ] AC-4: The result object exposes the breakdown (per-control) so the score is never a bare number.
- [ ] AC-5: vitest on the aggregation incl. an insufficient-evidence-heavy case (low coverage, flagged).

## Technical Notes

- Keep the metric definition in one documented place; surface the disclaimer in the UI copy later.

## Definition of Done
- [ ] ACs met; metric labelled "coverage"; confidence is evidence-derived; vitest green
- [ ] Parent epic RTV-30 (#501) updated

## Dependencies
- Parent: #501 (RTV-30); Depends on RTV-41
