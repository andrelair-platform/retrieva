---
id: RTV-29-control-library
title: "EPIC: DORA Control Library (versioned, regression-eval'd) + clause→control mapping"
status: Ready
type: Epic
epic: dora-tprm-domain
estimate: 13
labels: [epic, retrieva, cert, domain-logic, ai]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Epic

As a **compliance engineer**, I want a curated, versioned **Control Library** (DORA article → control → expected evidence → clause patterns) so that assessments are reproducible and inspectable — not a black-box prompt.

## Why

The control library is the real IP that makes Retrieva "not a GPT wrapper." It must be structured data (inspectable: "how did you decide audit rights are met?"), **versioned** (reproducible: "assessed vs control-lib v1.3 on <date>"), and **regression-tested** with an eval set so a model/prompt change can't silently degrade control mapping — reusing the discipline already built for phi3-financial / RTV-13 RAG-eval.

## Scope / Acceptance (epic-level)

- [ ] Control library modelled as **structured, versioned data** (not hardcoded prompts): control id, DORA article ref, description, expected evidence types, clause-match patterns, applicability rules.
- [ ] Covers the DORA control domains: governance, security, incident mgmt, business continuity, audit rights, data location, subcontracting, termination, exit strategy.
- [ ] **Clause → control mapping**: extracted contract clauses map to affected controls (e.g. "subprocessors" clause → subcontracting + data-location + notification controls).
- [ ] **Criticality (CIF) drives proportionality**: control depth/applicability keyed off critical-or-important-function status.
- [ ] **Regression eval harness** (reuse RTV-13 pattern): a labelled eval set gates control-mapping quality on model/prompt/library changes in CI.
- [ ] Library version stamped onto every assessment for reproducibility.

## Dependencies
- Depends on: RTV-28 (arrangement graph).
- Blocks: RTV-30 (assessment engine consumes the library), RTV-32 (change engine maps to controls).
