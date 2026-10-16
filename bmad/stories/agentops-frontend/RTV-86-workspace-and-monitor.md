---
id: RTV-86-workspace-and-monitor
title: "AgentOps frontend P0: Workspace (chat task-init) + Workflow monitor (run list + live status)"
status: Ready
type: Story
epic: agentops-frontend
estimate: 5
labels: [retrieva, cert, frontend]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As a **business user**, I want to **start an assessment from chat** and then **watch it progress** —
the agent steps, the current stage, and when it's waiting on a human — so I have a live control center,
not just a transcript.

## Context / constraints

- Retrieva frontend stack: **Next.js + React Query + zustand + socket.io-client** (all present). Live
  status via **socket.io** (RTV-82 events); commands via REST (RTV-78/85). Chat = entry point, dashboard
  = control center (hybrid UI, SDD §6).

## Acceptance

- [ ] **Task init**: chat action → `POST /assessment-runs` → a run appears in the list with status.
- [ ] **Workflow list**: the org's runs (React Query), newest first, with run status + "waiting on you" badge.
- [ ] **Run detail / monitor**: the agent stages (intake → gate → gap → findings) with per-stage state;
      reflects `queued/running/waiting_human/blocked/done` (RTV-85).
- [ ] **Live updates**: socket.io pushes stage/status changes without refresh.
- [ ] A `waiting_human` run links straight to its Approval-Center item (RTV-87).
- [ ] Shows **business** stages + outcomes, not raw model messages (debug view is separate).
- [ ] L1 (vitest) + a Playwright happy-path (start → see live status); a11y basics.

## Out of scope

The approval decision UI (RTV-87); the React Flow graph + evidence explorer (RTV-88).
