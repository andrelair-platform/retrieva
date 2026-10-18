---
id: RTV-92-ap-erp-invoice-ingestion
title: "Discovery connector: AP/ERP invoice ingestion → proposed arrangement"
status: Ready
type: Story
epic: discovery
milestone: "RTV — AI-native TPRM service"
estimate: 8
labels: [retrieva, cert, ai-native, backend, integration]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## Story

As an **ICT risk officer**, I want Retrieva to **read our accounts-payable / ERP feed (SAP/NetSuite)
and propose arrangements for ICT vendors we pay**, so that spend that never went through procurement
still shows up in the Register.

## Background

AP/ERP spend is the money-trail complement to the Okta app-trail (RTV-91): any vendor we pay is a vendor
we must register. A connector ingests invoice/vendor-master records, filters to likely ICT suppliers,
and maps each to a proposed **arrangement** (reusing the intake → decision-inbox → register rails and
the multi-modal document ingestion already used for contracts).

## Acceptance criteria

- A `connectors/ap-erp` module ingests invoice / vendor-master records (file export or API) and extracts
  supplier + spend + description.
- An LLM/heuristic classifier filters to **ICT** suppliers (non-ICT spend is excluded, with a reason).
- Each ICT supplier → a **proposed arrangement** with provenance (source + invoice/vendor id) in the
  decision inbox; dedupe against existing arrangements and against RTV-91 discoveries.
- LLM steps via the LiteLLM gateway; Langfuse-traced; dry-run mode supported.

## Definition of Done

- L0–L2 tests incl. the classifier and a mocked AP feed; mapping boundary has a contract/fixture test.
- No auto-write to the authoritative register; confirm-before-write enforced.
- Docs: supported input formats + the ICT-classification rubric.

## Out of scope

Live two-way sync back to the ERP; exotic ERP adapters beyond the first (SAP *or* NetSuite).
