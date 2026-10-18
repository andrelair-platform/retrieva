---
id: RTV-102-reintegration-modeling
title: "Reintegration modeling (how fast in-house could take over)"
status: Ready
type: Story
epic: exit-strategy
milestone: "RTV — AI-native TPRM service"
estimate: 5
labels: [retrieva, cert, ai-native, backend, domain-logic]
priority: Could
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## Story

As an **ICT risk officer**, for a CIF vendor I want Retrieva to **estimate how quickly we could stand up
an in-house (or alternative) replacement**, so the exit strategy states a realistic recovery timeline,
not a hope.

## Background

Completes the exit trio. Given the arrangement (service, data volume, criticality) and the exit blueprint
(RTV-101), produce a reintegration estimate: effort/time-to-stand-up, key dependencies/blockers, and a
confidence band — a structured estimate a human adjusts, not a black-box number.

## Acceptance criteria

- For a CIF arrangement with a blueprint, the service outputs a reintegration estimate: time-to-operational
  range, major dependencies/blockers, and assumptions — all shown (reproducible), not a single opaque score.
- LLM reasoning via the LiteLLM gateway, Langfuse-traced; deterministic inputs (data volume, tier) feed the
  estimate explicitly.
- Attached to the arrangement's exit section as a reviewable draft.

## Definition of Done

- L0–L2 tests over the estimator with fixtures; assumptions surfaced in the output.
- Docs: the estimate model + inputs.

## Out of scope

Cost modelling; integration with external capacity-planning tools.
