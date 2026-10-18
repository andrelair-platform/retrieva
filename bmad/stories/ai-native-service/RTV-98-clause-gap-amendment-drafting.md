---
id: RTV-98-clause-gap-amendment-drafting
title: "Clause-gap → drafted DORA amendment for legal review"
status: Ready
type: Story
epic: redliner
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

As a **legal reviewer**, when Retrieva finds a missing DORA Art 30 clause in a vendor contract, I want it
to **draft the amendment language for me**, so I start from an editable redline instead of a blank page.

## Background

Builds on the existing contract intake + clause-gap detection against the control library
(`services/controlLibraryService`, intake extraction). For each detected gap, generate a proposed clause
grounded in the control-library template for that Art 30 obligation, with the article citation and the
vendor-specific context slotted in.

## Acceptance criteria

- For an arrangement with detected Art 30 clause gaps, the service drafts **one amendment per gap**, each
  citing the specific DORA article/sub-paragraph and grounded in the control-library clause template.
- Drafts are attached to the arrangement and routed to a human (legal) for review/edit/accept via the
  approval flow — never auto-finalised or sent.
- Generation runs through the LiteLLM gateway; Langfuse-traced; the prompt is grounded in the control
  library (retrieval), not free generation.
- Each draft records provenance (which gap, which template version) for audit.

## Definition of Done

- L0–L2 tests: given fixtures of gaps + control-library templates, drafts are produced and grounded;
  the generation boundary has a contract/fixture test.
- Docs: how templates map to generated clauses; reviewer workflow.

## Out of scope

Full document assembly / DOCX redline export; e-signature; negotiation-round tracking (already exists).
