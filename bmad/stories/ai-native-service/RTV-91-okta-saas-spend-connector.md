---
id: RTV-91-okta-saas-spend-connector
title: "Discovery connector: Okta / SaaS-spend → proposed arrangements"
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

As an **ICT risk officer**, I want Retrieva to **sweep our identity / SaaS-spend system (Okta) and
auto-propose arrangements** for every ICT app in use, so that shadow IT surfaces itself into the
Register without anyone typing it in.

## Background

The first, highest-leverage discovery slice. Okta (or a SaaS-management/SSO source) is the cleanest
inventory of "apps the company actually uses". A connector lists those apps, the LLM maps each to a
proposed **arrangement** (provider → business function → ICT service, with a criticality guess), and the
proposal lands in the **decision inbox** for confirmation — reusing the intake → arrangement →
register machinery (`services/intake/*`, `decisionQueue/*`, the arrangements domain).

## Acceptance criteria

- A `connectors/okta` (or generic SaaS-spend) module authenticates (read-only token) and lists apps.
- Each discovered app → a **proposed arrangement** via the intake pipeline, with **provenance**
  (source system + external id) recorded.
- Proposals appear in the decision inbox as `AI-drafted`, never auto-written to the authoritative
  register; confirming one creates the arrangement.
- Dedupe against existing arrangements (don't re-propose a confirmed one).
- LLM mapping runs through the LiteLLM gateway; the run emits a Langfuse trace.
- A dry-run mode lists what *would* be proposed without writing.

## Definition of Done

- L0–L2 tests (connector unit + mapping + an integration against a mocked Okta); the LLM-mapping
  boundary covered by a contract/fixture test.
- Secrets handled per platform convention (no tokens in code); netpol allows only the connector egress.
- Docs: a short runbook + the arrangement provenance field documented.

## Out of scope

Other source systems (AP/ERP → RTV-92), continuous/scheduled sweeps (first slice is on-demand).
