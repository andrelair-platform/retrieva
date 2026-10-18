---
id: RTV-90-epic-discovery-agents
title: "Epic — Autonomous discovery agents (kill shadow IT)"
status: Ready
type: Epic
epic: discovery
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

Deliver the headline net-new capability of the AI-native service (Pillar 1): **autonomous discovery
agents** that sweep a client's enterprise source systems and auto-propose ICT arrangements into the
Register — so the register fills itself instead of being hand-entered. This is what makes "zero
data-entry burden" real.

## Scope

Connectors that read from source systems (identity/SaaS spend, AP/ERP), map each discovered vendor/
service to a **proposed arrangement** via the existing intake pipeline, and drop it into the HITL
**decision inbox** for a human to confirm. Plus a register-completeness agent that continuously flags
gaps on what's already there.

Today's intake (`retrieva-backend/services/intake/*`: `contractExtractionService`, `estateImport`) is
**upload-driven**. This epic adds **system-swept** intake on the same confirm-before-write rails.

## Child stories

- **RTV-91** — Okta / SaaS-spend connector → proposed arrangements
- **RTV-92** — AP/ERP invoice ingestion → proposed arrangement
- **RTV-93** — Register-completeness agent

## Success criteria

- A connector run discovers vendors from a real source system and produces human-confirmable proposed
  arrangements (nothing auto-written to the authoritative register).
- Discovered items carry provenance (which system, which record) and land in the decision inbox.
- All LLM mapping runs through the LiteLLM gateway and is Langfuse-traced.

## Governance (inherited by every child)

Autonomous discovery + drafting only — **never autonomous sign-off**. Proposals go through the decision
inbox / approval center; separation-of-duties applies; the authoritative register is only written on
human confirmation.
