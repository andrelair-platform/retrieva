---
id: RTV-84-agentops-workspace-epic
title: "AgentOps HITL workspace: operator frontend + first-class Approval Center for the assessment MAS"
status: Ready
type: Epic
epic: agentops-frontend
estimate: 13
labels: [epic, retrieva, cert, frontend, backend, ai]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Epic

As a **compliance operator**, I want an **AI operations workspace** — initiate assessments, watch the
agents work, and act on a first-class **Approval Center** (approve/edit/reject with the evidence in
front of me) — so humans supervise and control the agentic DORA-assessment MAS, not just read a chat log.

## Why

We've built the MAS backbone (deterministic supervisor RTV-78, A2A crew RTV-79/80, HITL baseline RTV-82).
The missing half is the **human surface**: *agents execute; humans supervise, collaborate, and control
critical decisions.* A chatbot isn't enough — an agent can pause at 23:00 and the reviewer acts next
morning, so approvals must be a **durable, first-class module** (they already survive via the Postgres
checkpointer). Strong **Bloc 2 (concevoir)** + **Bloc 3 (piloter — human oversight/governance)** evidence.

## Hard constraints (inherited)

- Deterministic routing + human-gated verdicts (ADR-AGENT-01); this adds the UI, **not** more autonomy.
- **Browser never resumes the graph** — it submits a decision; the backend validates (RBAC + SoD) + resumes.
- Server-side resumable state only; evidence-first; immutable audit; concurrency + stale-decision safety.
- Reuse **socket.io** (live events) + REST (commands); no new transport.

## Scope / Acceptance (epic-level)

- [ ] Enriched **run + approval** state machines, separated; Approval Center API with RBAC/SoD/concurrency/stale/audit (RTV-85).
- [ ] **Workspace + Workflow monitor** — chat task-init, run list, live status (RTV-86).
- [ ] **Approval Center** — inbox, evidence-first, approve/reject/edit/request-changes (RTV-87).
- [ ] **Execution explorer** + React Flow graph (RTV-88, P1).
- [ ] **Admin + analytics** (RTV-89, P2).
- [ ] Business-workflow view kept **separate** from internal agent reasoning (authorised debug view for traces).
- [ ] Tier-A test layers + live-dev QA gate before prod.

## Explicit non-goals

- Not org-wide — Retrieva only (generalisable foundation).
- No new autonomy / LLM-routing; deterministic steps stay code.
- No per-agent Kubernetes Deployments.

## Dependencies

RTV-78 (runs + checkpointer), RTV-79 (A2A contract → evidence), RTV-82 (HITL baseline). New frontend dep:
React Flow (P1 only). Authentik groups + RTV-51…56 authz for RBAC/SoD.
