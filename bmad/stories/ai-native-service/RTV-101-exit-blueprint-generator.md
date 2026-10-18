---
id: RTV-101-exit-blueprint-generator
title: "Exit-blueprint generator (portability timeline, key handover, parallel-run)"
status: Ready
type: Story
epic: exit-strategy
milestone: "RTV — AI-native TPRM service"
estimate: 8
labels: [retrieva, cert, ai-native, backend, domain-logic]
priority: Could
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## Story

As a **compliance analyst**, for a CIF vendor I want Retrieva to **generate a structured exit blueprint**
— data-portability timeline, decryption-key handover protocol, parallel-run testing steps — so the
documented transition plan DORA requires exists and is defensible.

## Background

The core exit artefact. From the arrangement (service type, data held, criticality) + the matched
alternative (RTV-100), generate a structured, sectioned blueprint grounded in a template, with concrete
timelines and steps. Produced as a human-reviewed draft attached to the arrangement.

## Acceptance criteria

- For a CIF arrangement, the service generates a blueprint with at least: data-portability plan + timeline,
  key/credential handover protocol, parallel-run test steps, rollback, and owner/RACI.
- Output is **structured** (sections/fields, not just prose) so it can be rendered and exported.
- Generation is grounded in a blueprint template via the LiteLLM gateway; Langfuse-traced; attached to the
  arrangement as a reviewable draft (not marked "approved" until a human signs off).

## Definition of Done

- L0–L2 tests: the generator produces a complete structured blueprint for fixture arrangements; the
  generation boundary has a contract test for the output schema.
- Docs: the blueprint schema + template.

## Out of scope

Reintegration modelling (RTV-102); automated execution of any transition step.
