---
sidebar_position: 1
slug: /
---

# Retrieva — DORA Third-Party Risk Management Platform

Welcome to the **Retrieva** documentation. Retrieva is a DORA third-party ICT risk-management platform
for financial entities. Its spine is an **agentic, human-gated assessment workflow running over a live
Register of Information** — AI drafts the analysis, a human decides, and every decision lands in an
auditable register. It covers the DORA third-party lifecycle end to end: building the register of
contractual arrangements, assessing providers against the regulation, surfacing concentration and
nth-party risk, tracking remediation, and exporting the EBA templates.

## What Retrieva does

Under **DORA (Regulation EU 2022/2554 — Digital Operational Resilience Act)**, Retrieva gives compliance
and risk teams:

- **Register of Information** — a live register of ICT contractual *arrangements* (provider → business
  function → ICT service, with criticality tiers and nth-party edges). Built by **AI-assisted contract
  intake** (the model proposes an arrangement from an uploaded contract; a human confirms) and **bulk
  estate import** (CSV/Excel), governed by a versioned, CIF-keyed **control library**.
- **Agentic assessment runs** — a deterministic **LangGraph supervisor** orchestrates each assessment
  (`intake → gap → findings`), delegating the gap analysis to a **CrewAI crew over A2A**. Runs are
  resumable (Postgres checkpointer), traced in Langfuse, and monitored live.
- **Human-in-the-loop governance** — nothing authoritative is written without sign-off. A **decision
  inbox** (cross-arrangement AI-draft queue) and an **approval center** (run-gate approvals) enforce
  review, with **separation-of-duties** on resume. *AI drafts, human decides.*
- **Concentration & nth-party risk** — model *critical function → provider → sub-provider* and answer
  "if this provider fails, which functions stop, and where are we over-concentrated?" (DORA Art 28(4)/29).
- **Risk register & remediation** — findings derive risks with a lifecycle
  (open → mitigating → mitigated → accepted → closed) and management-body risk acceptance.
- **Vendor questionnaires & evidence portal** — auto-generate and **LLM-score** security questionnaires
  (0–100); collect evidence from vendors against a DORA evidence checklist.
- **Compliance AI copilot** — ask compliance questions in natural language; a governed RAG pipeline
  searches your documents and the DORA knowledge base, with citations.
- **Monitoring & alerts** — automated 24-hour alerts for certification expiry, contract renewal, overdue
  annual reviews, and stale assessments.
- **Multi-tenant & multi-legal-entity** — workspace + legal-entity isolation, RBAC, MFA, field-level
  encryption, and full LLMOps observability.

## How an assessment flows

```
Contract / estate import → AI-proposed arrangement (human-confirmed) → Register of Information
        │
        ▼
Assessment run (LangGraph supervisor):  intake → [human gate] → gap analysis (CrewAI crew over A2A)
        │                                              │                       → findings
        ▼                                              ▼
Decision inbox / Approval center  ◄── AI drafts findings & risks; a human approves/edits/rejects
        │  (separation-of-duties, resumable via Postgres checkpointer, live-monitored over Socket.io)
        ▼
Register projection · Risk register · Concentration graph · EBA RT.01–RT.04 export
```

## Key features

### Register of Information (the arrangements domain)

The register is a first-class domain, not just an export. Arrangements link **provider → business
function → ICT service** with criticality tiers; a **live RT.02.01 projection**
(`GET /api/v1/register`) renders the EBA view on demand. Arrangements are created by AI-assisted
contract intake (human-confirmed) or bulk estate import, and move through a lifecycle with periodic
re-assessment cadence.

### Agentic assessment orchestration

A **deterministic LangGraph `StateGraph` supervisor** runs each assessment — deterministic routing only
(no free-form ReAct/tool-calling), **halt-on-doubt**, and a **human gate before anything authoritative**.
The gap-analysis node is delegated to a deployed **CrewAI crew over A2A (JSON-RPC)**. Runs persist via a
Postgres checkpointer (resumable) and emit a per-run Langfuse trace.

### Human-in-the-loop governance

Two surfaces keep a human in the loop: a **decision inbox** that merges AI-drafted findings and open
risks into one queue (most-uncertain / most-severe first), and an **approval center** that gates
assessment *runs* by `runId + gate`. **Separation-of-duties** is enforced on resume, and the run monitor
streams live progress over Socket.io.

### Intelligent RAG copilot

```
User Question → Query Rephrasing → Vector Retrieval → Dedup + Reranking
     → Context Compression → LLM Generation → Answer Validation (LLM judge)
```

### DORA gap analysis

The assessment worker analyses vendor ICT documentation against DORA articles and classifies coverage
per article:

```
File Upload → Parse (PDF/DOCX/XLSX) → Semantic Chunking → Embed to Qdrant
     → LLM Gap Analysis per DORA Article → covered / partial / missing
```

### Concentration & nth-party risk

A dashboard + scoring engine over the *critical function → provider → sub-provider* graph (with
AI-extracted sub-provider edges, human-confirmed) surfaces single-points-of-failure and
over-concentration for DORA Art 28(4)/29.

### Automated compliance monitoring

A BullMQ repeatable job runs every 24 hours and emails alerts to workspace owners:

- Certification expiry — 90 / 30 / 7 day thresholds
- Contract renewal — 60 days
- Annual review overdue
- No assessment in 12 months

### EBA Register of Information export

`GET /api/v1/workspaces/roi-export` generates a 4-sheet XLSX workbook — the *output* of the arrangements
domain above:

| Sheet | Content |
|-------|---------|
| RT.01.01 Summary | Institution summary + vendor counts by criticality tier |
| RT.02.01 ICT Providers | One row per vendor with contract, country, service type, tier, scores |
| RT.03.01 Certifications | One row per certification per vendor |
| RT.04.01 Gap Summary | One row per DORA gap from the latest complete assessment |

### Multi-layer security

- JWT-based authentication with refresh tokens + MFA
- Workspace RBAC (owner, member, viewer) + organisation/domain roles; legal-entity (branch) isolation
- Database-level tenant isolation (every query scoped to the caller's workspace)
- LLM output guardrails and confidence-based hallucination blocking (+ PII scanning)
- AES-256-GCM field-level encryption for sensitive data at rest

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Express 5, Node.js 20+ |
| AI Orchestration | LangChain (LCEL chains, prompts, parsers) + LangGraph supervisor (Postgres checkpointer) |
| Agent interop | CrewAI assessment crew delegated over **A2A** (JSON-RPC) |
| LLM | All calls routed through the **LiteLLM** gateway (OpenAI-compatible `/v1`); the gateway owns provider routing (Ollama Cloud, Azure OpenAI, Bedrock…), key rotation, fallbacks, PII masking and budgets. Model/intent alias chosen per purpose via `LLM_MODEL` / `LLM_<purpose>_MODEL` |
| Embeddings | Self-hosted Ollama `bge-m3:latest` (1024-dim, 8192-token context); OpenAI `text-embedding-3-small` cloud fallback |
| Vector Store | Qdrant |
| Database | PostgreSQL (Drizzle ORM) |
| Cache / Queue | Redis, BullMQ |
| Real-Time | Socket.io |
| Frontend | Next.js 16, React 19, TypeScript |
| UI Components | shadcn/ui, Tailwind CSS |
| Monitoring | Langfuse (LLM traces + cost) · Prometheus / Grafana |
| Billing | Stripe |
| Export | xlsx (XLSX workbook generation) |

## Architecture Overview

[![Retrieva architecture overview](/img/architecture/retrieva-overview.svg)](/img/architecture/retrieva-overview.svg)

*Browser (SSO) → Next.js frontend → Express 5 API (JWT · RBAC · per-workspace isolation) → capability
services (RAG/Copilot, Assessment orchestrator, Questionnaire, Arrangements/RoI, Concentration, Risk)
and BullMQ workers (ingest, questionnaire, 24h monitoring) → datastores (Qdrant vectors · PostgreSQL ·
Redis). All LLM/embedding calls go through the governed **LiteLLM** gateway, traced in **Langfuse**. The
diagram is [generated from code](https://github.com/andrelair-platform/retrieva/blob/main/docs/diagrams/retrieva_overview.py)
so it never drifts. For the detailed C4 container view, see [Architecture → Solution Architecture](/architecture/solution-architecture).*

## Build history

Retrieva grew from a RAG copilot into the agentic TPRM platform above. The original four delivery phases
are the **foundation layer**:

| Phase | Feature | Status |
|-------|---------|--------|
| Phase 1 | DORA Copilot foundation — knowledge ingestion, vector search, conversational Q&A | ✅ Production |
| Phase 2 | Vendor document upload (PDF, DOCX, XLSX); DORA gap assessment UI | ✅ Production |
| Phase 3 | Vendor questionnaires with LLM scoring | ✅ Production |
| Phase 4 | Monitoring alerts + Register of Information export | ✅ Production |
| TPRM v1 | Arrangements/Register domain · agentic assessment runs · human-in-the-loop governance · concentration & nth-party risk · risk register · evidence portal | ✅ Shipped |

## Quick Links

- [Getting Started](/getting-started) — Set up the platform locally
- [Architecture Overview](/architecture/overview) — Understand the system design
- [Agentic Assessment Orchestrator](/architecture/agentic-assessment-orchestrator) — the supervisor graph + A2A crew
- [AgentOps / HITL Workspace](/architecture/agentops-hitl-workspace) — decision inbox + approval center
- [DORA TPRM Domain Model](/architecture/dora-tprm-domain-model) — arrangements, register, controls
- [Concentration Graph](/architecture/concentration-graph) — nth-party risk model
- [API Reference](/api/overview) — Explore the REST API
- [Security](/security/overview) — Security measures and RBAC
- [Deployment](/deployment/docker) — Deploy to production
