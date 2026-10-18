---
id: RTV-105-answer-evidence-contradiction
title: "Answer-vs-evidence contradiction detection (catch paper compliance)"
status: Ready
type: Story
epic: adaptive-ddq
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

As a **third-party risk analyst**, when a vendor answers a questionnaire, I want Retrieva to
**cross-check their answers against their own technical evidence** (SOC2/ISO/policies) and flag
discrepancies, so I catch "paper compliance" instead of taking answers at face value.

## Background

The highest-signal half of Pillar 2. Reuses the RAG/evidence retrieval already in place: for each
material questionnaire answer, retrieve the relevant evidence chunks and judge whether the evidence
**supports / contradicts / is silent on** the answer — flagging contradictions (and unsupported claims)
for analyst review with the citation.

## Acceptance criteria

- For each material answer, the service classifies evidence support as `supports` / `contradicts` /
  `insufficient-evidence`, grounded in retrieved evidence snippets (cited).
- `contradicts` / `insufficient-evidence` on a material control raises a discrepancy finding in the
  decision inbox with the answer + evidence snippet shown side by side.
- Judgement runs via the LiteLLM gateway, Langfuse-traced; it **flags**, never auto-fails the vendor.
- Reproducible: the cited evidence + verdict are stored for audit.

## Definition of Done

- L0–L2 tests: supports / contradicts / silent fixtures produce the right verdict; the judge boundary has
  a contract/fixture test.
- Docs: how materiality is decided + the verdict schema.

## Out of scope

Auto-remediation or auto-scoring changes; multi-document reconciliation beyond the vendor's own evidence.
