---
id: RTV-99-epic-exit-strategy
title: "Epic — Dynamic exit strategy & transition planning (CIFs)"
status: Ready
type: Epic
epic: exit-strategy
milestone: "RTV — AI-native TPRM service"
estimate: 21
labels: [retrieva, cert, ai-native, backend, domain-logic]
priority: Could
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Epic

Pillar 4 — the largest net-new area. For vendors supporting **Critical or Important Functions (CIFs)**,
DORA requires viable **exit strategies** and documented **transition plans**. Retrieva has CIF
identification + criticality tiers; this epic builds the exit capability on top: find alternatives,
generate the exit blueprint, and model reintegration.

## Scope

Three capabilities, each grounded in the arrangement/CIF data and produced as human-reviewed artefacts:
alternative-provider matching, exit-blueprint generation, and reintegration modelling.

## Child stories

- **RTV-100** — Alternative-provider matching
- **RTV-101** — Exit-blueprint generator
- **RTV-102** — Reintegration modeling

## Success criteria

- For a CIF arrangement, Retrieva proposes credible alternative providers, generates a structured exit
  blueprint (portability timeline, key handover, parallel-run), and gives a reintegration estimate.
- All outputs are human-reviewed artefacts attached to the arrangement; LLM steps via the LiteLLM
  gateway, Langfuse-traced.

## Governance

Exit artefacts are **drafts for the risk owner** — Retrieva proposes options and plans; the business
owns the decision and the plan sign-off.
