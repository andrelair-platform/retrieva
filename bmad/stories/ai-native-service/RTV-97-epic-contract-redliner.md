---
id: RTV-97-epic-contract-redliner
title: "Epic — Automated contract redliner (DORA Art 30)"
status: Ready
type: Epic
epic: redliner
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

Pillar 3: close the loop on contract compliance. Retrieva already **extracts** contracts and **detects
missing DORA Art 30 clauses** against the control library. This epic adds the next step — **drafting the
missing clauses as a redline/amendment** for the legal team to review and send.

## Scope

Given an arrangement's contract + its detected clause gaps, generate DORA-aligned **amendment text** per
missing clause (grounded in the control library's clause templates), presented for legal review and
sign-off — never auto-sent.

## Child stories

- **RTV-98** — Clause-gap → drafted DORA amendment for legal review

## Success criteria

- For a contract with known Art 30 gaps, the service produces clause-by-clause draft amendments citing
  the relevant DORA article, routed to a human (legal) for review.
- Drafts are grounded in the versioned control library (not free-hallucinated), via the LiteLLM gateway,
  Langfuse-traced.

## Governance

Drafting only. Amendments are **proposals** reviewed and owned by legal via the approval flow; Retrieva
never finalises or transmits contract language.
