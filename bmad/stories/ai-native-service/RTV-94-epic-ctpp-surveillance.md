---
id: RTV-94-epic-ctpp-surveillance
title: "Epic — Continuous CTPP & supply-chain surveillance"
status: Ready
type: Epic
epic: surveillance
milestone: "RTV — AI-native TPRM service"
estimate: 13
labels: [retrieva, cert, ai-native, backend, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Epic

Pillar 5: watch the outside world. Critical ICT third-party providers (CTPPs — AWS, Azure, GCP, major
financial SaaS) are directly overseen by the ESAs. This epic gives Retrieva **24/7 external surveillance**
of those providers — outages, breaches, regulatory actions, geopolitical exposure — and ties each signal
back to **who it affects** via the concentration graph.

## Scope

An external-signal ingestion layer (status pages, CVE/breach feeds, news/regulatory sources) that matches
events to providers already in the register/graph, raises alerts, and annotates the concentration graph
node — turning the (static) nth-party graph into a live risk radar.

## Child stories

- **RTV-95** — External CTPP signal ingestion (status / breach / CVE feeds)
- **RTV-96** — Attach surveillance events to the concentration graph + alert

## Success criteria

- A real external event about a tracked CTPP is ingested, matched to the right provider node, and raised
  as an alert within the monitoring pipeline.
- The concentration graph shows live signal state per node (not just structural edges).
- Signal classification runs via the LiteLLM gateway; Langfuse-traced; no autonomous action beyond
  alerting.

## Governance

Surveillance **informs**; it never auto-changes a risk rating or a register entry. Material signals open
a finding for human review (decision inbox), consistent with the service's HITL spine.
