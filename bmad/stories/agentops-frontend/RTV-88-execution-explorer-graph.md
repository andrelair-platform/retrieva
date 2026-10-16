---
id: RTV-88-execution-explorer-graph
title: "AgentOps frontend P1: Execution explorer (agent timeline + evidence) + React Flow workflow graph"
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

As a **developer / auditor**, I want to inspect **what each agent did, why, and with what evidence** —
a per-run timeline and a visual workflow graph — so I can understand, debug, and defend a run.

## Context / constraints

- P1 — after the P0 operator loop (RTV-86/87) is proven on dev. Adds the **React Flow** dep (new).
- Keeps the business view (RTV-86) separate; this is the **authorised technical/debug** surface
  (events, agent outputs, Langfuse trace link) — gated by role.

## Acceptance

- [ ] **Timeline**: ordered events per run (`GET /assessment-runs/:id/audit`) — node enters/exits, gate
      pauses/resumes, decisions, with timestamps + actors.
- [ ] **Evidence viewer**: the citations/findings for a run (from the RTV-79 response), linkable from a finding.
- [ ] **Workflow graph** (React Flow): intake → gate → gap → findings/halt, node status-coloured, the
      current/blocked node highlighted; read-only.
- [ ] Deep link to the Langfuse trace for the run (authorised users).
- [ ] Role-gated (auditor/developer); hidden from plain business users.
- [ ] L1 + a Playwright smoke (open a completed run → see timeline + graph).

## Out of scope

Live editing from the graph; admin/analytics (RTV-89).
