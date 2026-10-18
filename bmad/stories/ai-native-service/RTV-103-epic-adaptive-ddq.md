---
id: RTV-103-epic-adaptive-ddq
title: "Epic — Adaptive DDQ & answer-vs-evidence contradiction detection"
status: Ready
type: Epic
epic: adaptive-ddq
milestone: "RTV — AI-native TPRM service"
estimate: 8
labels: [retrieva, cert, ai-native, backend, domain-logic]
priority: Could
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Epic

Pillar 2 upgrade: move vendor due diligence from **static** questionnaires to **interactive, adaptive**
diligence that catches "paper compliance". Retrieva already scores questionnaires and ingests vendor
evidence; this epic makes the questionnaire adapt to vendor criticality and **cross-checks answers against
the vendor's technical documents** to flag discrepancies.

## Scope

Two capabilities on top of the existing questionnaire + evidence modules: criticality-tailored question
generation, and an evidence-contradiction detector that compares stated answers to uploaded SOC2/ISO/
policy evidence.

## Child stories

- **RTV-104** — Adaptive DDQ generation by criticality
- **RTV-105** — Answer-vs-evidence contradiction detection

## Success criteria

- A questionnaire adapts its questions to the vendor's criticality tier / service type.
- When a vendor's answer contradicts their own evidence, Retrieva flags the discrepancy for analyst
  review (decision inbox), grounded in the cited evidence — via the LiteLLM gateway, Langfuse-traced.

## Governance

The detector **flags**; it never auto-fails a vendor. Discrepancies open a human review with the
contradicting answer + evidence snippet side by side.
