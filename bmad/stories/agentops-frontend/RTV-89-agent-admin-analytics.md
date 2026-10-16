---
id: RTV-89-agent-admin-analytics
title: "AgentOps frontend P2: agent administration (tools/policies/access) + analytics"
status: Ready
type: Story
epic: agentops-frontend
estimate: 5
labels: [retrieva, cert, frontend]
priority: Could
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As an **admin / engineer**, I want to configure the crew and approval policies, and see throughput
analytics — so the MAS is operable and tunable without code changes.

## Context / constraints

- P2 — after the P0/P1 experiences. Admin surfaces are **role-gated** (admin/engineer) and change only
  governed config, never the deterministic control flow.

## Acceptance

- [ ] **Agent/crew admin**: view the Agent Card (RTV-79) + crew/skill version; control-library version in use.
- [ ] **Approval policy**: configure which gates require which role / multi-person (SoD) — server-enforced.
- [ ] **Access**: map Authentik groups → reviewer/admin roles (read-only view at minimum).
- [ ] **Analytics**: runs analysed / pending reviews / completed / avg time-to-decision (the dashboard counters).
- [ ] Role-gated; all config changes audited.
- [ ] L1 + Playwright smoke.

## Out of scope

Autonomy/routing changes (deterministic by design); org-wide multi-product admin.
