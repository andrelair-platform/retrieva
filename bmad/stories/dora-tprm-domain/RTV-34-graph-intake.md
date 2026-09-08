---
id: RTV-34-graph-intake
title: "EPIC: Graph intake — AI-assisted population (contract-parse → propose → confirm)"
status: Ready
type: Epic
epic: dora-tprm-domain
estimate: 13
labels: [epic, retrieva, cert, domain-logic, ai]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Epic

As a **compliance owner**, I want the arrangement graph populated with low friction — by parsing existing contracts and importing from infra inventories, with AI proposing edges a human confirms — so that the graph is actually kept current.

## Why

Graph **freshness** is the real operational failure mode of every GRC tool: a beautiful model nobody maintains is worthless, and business owners won't hand-maintain "Azure hosts Claims." AI-assisted population (propose → human confirms) is arguably a bigger near-term value than the assessment itself, and it directly feeds the change engine (RTV-32) and concentration graph (RTV-28).

## Scope / Acceptance (epic-level)

- [ ] **Contract-parse → propose graph edges** (provider, service, subprocessors, data location, function) via the ingestion + engine; a human **confirms** before edges become authoritative.
- [ ] **Connector imports** to seed the graph: cloud resource tags, SSO app inventory, CMDB (best-effort, pluggable).
- [ ] Proposed vs confirmed state on edges; provenance recorded (source, date) in the audit trail.
- [ ] Keeps provider-global vs arrangement-local evidence separation (RTV-28) on ingested data.

## Dependencies
- Depends on: RTV-28 (graph), RTV-14 (ingestion), RTV-30 (extraction).
