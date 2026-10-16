# Retrieva — AgentOps HITL workspace (operator frontend + enriched HITL backend)

**Product / board:** Retrieva — RNCP39583 Certification (Project #2)
**Initiative:** Certification · **Home repo:** `retrieva` (frontend) + `retrieva-backend` (API)
**SDD:** `retrieva/docs/docs/architecture/agentops-hitl-workspace.md` (ADR-AGENT-03)

## The model (one line)

**Turn the agentic DORA-assessment MAS into an _AI operations workspace_: agents execute; humans
supervise, review evidence, and control the critical decisions** — a first-class Approval Center + live
workflow monitoring on Retrieva's existing Next.js/Express/socket.io stack, keeping the deterministic,
human-gated thesis (ADR-AGENT-01).

## Scope decisions (deliberate)

- **Retrieva-scoped**, built to generalise into a reusable AgentOps foundation — **not** an org-wide MAS.
- **Reuse socket.io** (already wired) for live events; REST for commands; **no new SSE/WebSocket layer**.
- **Deterministic steps stay code** — this adds the *human* surface, not more autonomy.
- **Browser never resumes the graph** — it submits a decision; the backend validates (RBAC + SoD) + resumes.
- React Flow (graph) deferred to **P1**; admin/analytics to **P2**.

## Epic tracker

| ID | Story | Repo | Pri |
|---|---|---|---|
| RTV-84 | **Epic** — AgentOps HITL workspace | retrieva | P0 |
| RTV-85 | Backend: enriched run+approval state machines + Approval Center API (RBAC/SoD/concurrency/stale/audit) | retrieva-backend | P0 |
| RTV-86 | Frontend P0: Workspace (chat task-init) + Workflow list + live status (socket.io) | retrieva | P0 |
| RTV-87 | Frontend P0: Approval Center inbox (approve/reject/edit/request-changes, evidence-first) | retrieva | P0 |
| RTV-88 | Frontend P1: Execution explorer (agent timeline + evidence) + React Flow graph | retrieva | P1 |
| RTV-89 | P2: Agent administration + analytics | retrieva | P2 |

## Sequencing

RTV-85 (backend contract + state machines) first — it unblocks the frontend. Then RTV-86 + RTV-87 (the
P0 operator experience) in parallel against the API. RTV-88/89 after the P0 loop is proven on live dev.
Builds on **RTV-82** (HITL baseline) and **RTV-78** (run + checkpointer); consumes the **RTV-79** A2A
contract for evidence display.

## Governance / RACI (delta from the orchestrator sprint)

Adds **UX/UI** (the operator workspace is a real UI now) and **FE** (frontend dev) as active roles;
**SEC** stays heavy (RBAC/SoD/audit/stale-decision are the enterprise gates). PO/STK own the Approval
Center acceptance (it's the human-authority surface). QA gate + Tier-A test layers before prod as usual.
