---
sidebar_position: 15
title: AgentOps HITL Workspace
---

# AgentOps — Human-in-the-Loop workspace (SDD addendum)

> The operator **frontend + HITL backend** for Retrieva's agentic DORA-assessment MAS. It extends the
> [Agentic Assessment Orchestrator](./agentic-assessment-orchestrator.md) (the supervisor + CrewAI crew
> over A2A) with the human side: an **AI operations workspace**, not a chatbot. **Agents execute the
> work; humans supervise, collaborate, and control the critical decisions.**
>
> - **Scope:** Retrieva (the DORA-assessment objective). Built so it generalises into a **reusable
>   AgentOps foundation** (claims, underwriting, compliance…) — *not* an org-wide big-bang.
> - **Owner (SA/TL):** AndreLiar · **Status:** draft · **Date:** 2026-10-16 · **Board:** #2 · **Delivery path:** C
> - **Cert evidence:** Bloc 2 (concevoir) + Bloc 3 (piloter — human oversight, governance).

## 0. Why this, and the non-negotiable it preserves

A MAS is **not** automatically better than a single agent, and deterministic business steps should stay
ordinary code. This workspace keeps our thesis (ADR-AGENT-01 / RTV-76): **deterministic routing, autonomy
confined to the crew, every consequential decision human-gated.** The frontend's job is to turn the
runtime's pause/resume events into a **safe, legible business workflow** — the human sees the
*recommendation, evidence, consequences, uncertainty, and controls*, not raw model messages.

## 1. Conceptual view — the five modules  *(PM / stakeholder)*

| Module | Screens | Primary user |
|---|---|---|
| **Workspace** | chat task-initiation, submit documents | business users |
| **Workflow monitor** | run progress, agent steps, blockers | users, operators |
| **Approval Center** *(first-class)* | review queue, evidence, decision | authorised reviewers |
| **Execution explorer** | events, agent outputs, audit history | developers, auditors |
| **Agent administration** | tools, versions, policies, access | admins, engineers |

The **Approval Center is a first-class module**, not an "Approve" button in chat: an agent can pause at
23:00 and the reviewer acts next morning — the task must survive browser closes, restarts, and delays
(it does: LangGraph Postgres checkpointer + the `decisionQueue` + `assessment_runs`).

## 2. HITL interaction taxonomy (the frontend must distinguish these)

| Interaction | Human does | Retrieva example |
|---|---|---|
| **Approval** | accept/reject an action | approve findings → register |
| **Review & edit** | correct a proposed output | fix an extracted arrangement field |
| **Clarification** | supply missing info | provide a contract date |
| **Escalation** | take ownership from an agent | send to a senior reviewer / committee |
| **Override** | change a decision with justification | override a verdict (recorded) |
| **Monitoring** | watch, intervene | cancel a run |

## 3. Two state machines — kept separate  *(Component view)*

**Run** (extends the RTV-78 `assessment_runs` enum — add `queued`, `resuming`, `cancelled`; keep
`blocked` = halt-on-doubt, distinct from a hard `failed`):

```
queued → running → waiting_human → resuming → running → … → done
                        │                         ├─ blocked   (halt-on-doubt, human review)
                        └─ cancelled              └─ failed    (hard error)
```

**Approval** (a *separate* entity — one run may have several, to different people):
`pending → approved | rejected | expired | superseded`.

> A run's status and an approval's status are **not** the same field. Do not collapse to
> running/done/failed — that was the common mistake this design avoids.

## 4. API + events contract  *(Component — on Express 5 + socket.io, not FastAPI)*

| Endpoint | Responsibility |
|---|---|
| `POST /api/v1/assessment-runs` | start a run (RTV-78, exists) |
| `GET /api/v1/assessment-runs/:id` | run state |
| `GET /api/v1/assessment-runs?waitingOnMe=true` | my pending work (RTV-82) |
| `GET /api/v1/approvals` · `GET /api/v1/approvals/:id` | review queue · evidence + proposed action |
| `POST /api/v1/approvals/:id/decision` | an **authorised** decision (approve/reject/edit/request-changes) |
| `POST /api/v1/assessment-runs/:id/resume` | backend-only resume (RTV-82) |
| `GET /api/v1/assessment-runs/:id/audit` | immutable audit trail |

- **Live updates = socket.io** (already wired, RTV-82) — reuse it rather than add SSE. REST for commands.
- **The browser NEVER calls `Command(resume=…)`.** It submits a *decision*; the backend validates the
  reviewer (RBAC + SoD), records it, and coordinates the resume. Server-side state only — never trust a
  browser-supplied checkpoint or claimed permission.

## 5. Security & enterprise requirements (frontend + backend, from day one)

- **RBAC** — only authorised reviewers act on a given approval (Authentik groups + RTV-51…56 authz).
- **Evidence-first** — show documents, sources, business rules, consequences, confidence.
- **Immutable audit** — who/when/what-proposed/which-justification (append-only; Langfuse trace linked).
- **Concurrency safety** — two reviewers can't approve the same pending action (optimistic lock / row version).
- **Stale-decision protection** — reject a decision if the run/proposed-action changed since it was shown.
- **Separation of duties** — maker ≠ checker; multi-person for sensitive actions (RTV-55).
- **Server-side resumable state** — the browser gets only authorised approval details + opaque ids.

## 6. Architecture / stack (the real one)

```
Next.js + React Query + zustand + socket.io-client  (+ React Flow for the graph, P1)
        │ REST commands              ▲ socket.io live events
        ▼                            │
retrieva-backend (Express 5)  —  Approval service + RBAC/SoD + audit
        │ in-process
        ▼
LangGraph-JS supervisor (RTV-78) + Postgres checkpointer + decisionQueue + assessment_runs
```

Hybrid UI: **chat is the entry point, the dashboard is the control center.** A user initiates in chat →
a run is created → the reviewer gets an Approval-Center item → decides → the user sees the status update
in their original conversation. One workflow instance throughout.

## 7. Decision log (ADR)

**ADR-AGENT-03 — AgentOps HITL frontend (first-class Approval Center, separated state machines,
socket.io transport).** *Status: Accepted (2026-10-16).* **Decision:** build the operator workspace on
Retrieva's existing Next.js frontend + Express backend; make the Approval Center a first-class module
with its own entity + state machine (separate from run status); reuse **socket.io** for live events
(already wired) rather than introduce SSE; the browser submits decisions, the backend owns resume +
authz + audit. **Alternatives:** approve-in-chat only (rejected — doesn't survive delays/restarts);
SSE (rejected — socket.io already present); per-agent Deployments (rejected — one service, logical
agents). **Consequences:** a richer run enum + a new approvals table; React Flow added only at P1.
**Scope:** Retrieva; generalisable, not org-wide.

> Index in the product [Solution Architecture](./solution-architecture.md) §Decision log.

## 8. Delivery (MVP phases) → stories

| Phase | Deliverable | Pri | Story |
|---|---|---|---|
| P0 | Enriched run+approval state machines + Approval API + RBAC/SoD/concurrency/stale/audit (backend) | P0 | RTV-85 |
| P0 | Workspace + Workflow list + live status (frontend) | P0 | RTV-86 |
| P0 | Approval Center inbox (approve/reject/edit/request-changes, evidence-first) | P0 | RTV-87 |
| P1 | Execution explorer (agent timeline + evidence viewer) + React Flow graph | P1 | RTV-88 |
| P2 | Agent administration + analytics | P2 | RTV-89 |

Builds on RTV-82 (the HITL baseline) and RTV-78 (the run + checkpointer). The business-workflow view is
kept separate from internal agent reasoning (an authorised debugging view exposes the technical traces).
