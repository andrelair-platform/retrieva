---
id: RTV-85-approval-center-backend
title: "Approval Center backend: enriched run+approval state machines + authorised decision API (RBAC/SoD/concurrency/audit)"
status: Ready
type: Story
epic: agentops-frontend
estimate: 8
labels: [retrieva, cert, backend, security, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## Story

As the **platform**, I want approvals modelled as a **first-class entity** with their own state machine
(separate from run status) and an **authorised decision API** — so the operator frontend has a durable,
safe, auditable contract, and the browser never resumes the graph itself.

## Context / constraints

- Extends RTV-82 (the HITL baseline) + RTV-78 runs. **Reuse socket.io** for live events; REST for commands.
- **Browser submits a decision; backend validates + resumes** (SDD §4). Server-side state only.

## Acceptance

- [ ] **Run state machine** extended: add `queued`, `resuming`, `cancelled` to `assessment_run_status`
      (keep `blocked` = halt-on-doubt, distinct from `failed`). Drizzle migration + transitions enforced.
- [ ] **Approval entity** (`decision_queue_item` extended / new table): `run_id, gate, assignee, status
      (pending|approved|rejected|expired|superseded), proposed_action, decided_by, justification, row_version`.
- [ ] **API:** `GET /approvals` (mine/pending), `GET /approvals/:id` (evidence + proposed action),
      `POST /approvals/:id/decision` (approve/reject/edit/request-changes); `GET /assessment-runs/:id/audit`.
- [ ] **RBAC + SoD** — only an authorised reviewer acts; maker ≠ checker (RTV-55); 403 otherwise.
- [ ] **Concurrency safety** — optimistic lock (`row_version`); a second concurrent decision → 409.
- [ ] **Stale-decision protection** — decision rejected (409) if the run/proposed-action changed since shown.
- [ ] **Immutable audit** — append-only record (who/when/what/justification) + Langfuse trace link.
- [ ] **Resume coordination** — a valid `approve`/`edit` calls the graph resume (RTV-82) server-side.
- [ ] OpenAPI updated (+ `openapi/mounts.ts` if new routers); **L2 + L3** tests; no regression.

## Out of scope

The frontend (RTV-86/87); React Flow (RTV-88).
