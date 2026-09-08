---
id: RTV-30-assessment-engine
title: "EPIC: Assessment engine — evidence-grounded, human-approved gap analysis"
status: Ready
type: Epic
epic: dora-tprm-domain
estimate: 21
labels: [epic, retrieva, cert, domain-logic, ai, rag]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Epic

As an **ICT risk analyst**, I want the engine to assess an arrangement against the control library and produce **evidence-grounded, cited** findings that I review and approve, so that the output is audit-defensible and legally safe.

## Why

An AI that outputs "non-compliant" with no evidence manufactures false findings — worse than useless in an audit. The engine must cite the exact clause/evidence, default to "insufficient evidence" on absence, report **coverage not "% compliant"**, and leave the risk decision to a human (DORA puts ICT-TPR on the management body; EU AI-Act wants decision-support + human oversight). Built on the shipped RAG (RTV-05) + ingestion (RTV-14) + LLMOps stack.

## Scope / Acceptance (epic-level)

- [ ] Verdict enum: **Compliant / Partial / Non-compliant / Insufficient-evidence / N-A**; **absence of a document → "insufficient evidence, human review", NEVER auto non-compliant**.
- [ ] Every verdict **cites the exact clause/evidence** and states what was searched (auditable rationale, not a bare score).
- [ ] Output framed as **control/evidence coverage**, never "X% DORA compliant".
- [ ] **Confidence grounded in evidence coverage** (expected doc types found? corroborating clauses? recency?) — not raw LLM self-reported confidence.
- [ ] **Human-in-the-loop**: AI analyses/drafts; a human makes the risk decision; every AI output is an attributable, reviewable artifact linked in the audit trail.
- [ ] Full trace in Langfuse (per `llmops.md`); cost-gated like RTV-14.
- [ ] Feeds **findings** into the risk/remediation workflow (RTV-17) and the graph (RTV-28).

## Dependencies
- Depends on: RTV-28 (graph), RTV-29 (control library).
- Relates to: RTV-16 (evidence), RTV-17 (finding/risk workflow).
