---
id: RTV-87-approval-center-frontend
title: "AgentOps frontend P0: Approval Center inbox — evidence-first approve/reject/edit/request-changes"
status: Ready
type: Story
epic: agentops-frontend
estimate: 5
labels: [retrieva, cert, frontend, security]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As an **authorised reviewer**, I want a dedicated **Approval Center** — a queue of pending reviews where
each item shows the **recommendation, evidence, consequences, and confidence**, and lets me
**approve / reject / edit / request changes** — so I make accountable decisions and the workflow resumes
safely.

## Context / constraints

- First-class module (SDD §1), not an "Approve" button in chat. Consumes the RTV-85 API; decisions go to
  `POST /approvals/:id/decision` — **the frontend never resumes the graph**.
- Evidence-first: render citations/sources from the RTV-79 response + the arrangement context.

## Acceptance

- [ ] **Inbox**: `GET /approvals?mine=true` — pending items with gate, run, age, SLA/age indicator.
- [ ] **Review screen**: proposed action + findings/verdicts + **citations/evidence** + confidence + the
      consequence of approving; the maker shown (SoD transparency).
- [ ] **Decisions**: approve · reject · **edit** (correct the proposed output) · request-changes — each
      posts to RTV-85 with a justification field (required for reject/override).
- [ ] **Concurrency/stale UX**: a 409 (someone else decided, or the action changed) shows a clear
      "this review is no longer current" state + refresh — never a silent overwrite.
- [ ] **RBAC**: non-authorised users can't see/act (server-enforced; UI hides the controls).
- [ ] After a decision, the originating run + the user's chat reflect the new status (socket.io).
- [ ] L1 + Playwright: approve-path resumes the run to `done`; reject-path → `blocked`.

## Out of scope

The backend authz/state machine (RTV-85); timeline/graph (RTV-88); admin (RTV-89).
