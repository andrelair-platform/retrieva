---
sidebar_position: 1
slug: /
---

# Retrieva — DORA Compliance Platform

Welcome to the **Retrieva** documentation. Retrieva is a production-ready DORA compliance intelligence platform for financial entities — automating third-party ICT risk assessments, vendor questionnaires, monitoring alerts, and EBA Register of Information export.

## What is Retrieva?

Retrieva helps compliance and risk teams meet their obligations under **DORA (Regulation EU 2022/2554 — Digital Operational Resilience Act)**:

- **Third-Party ICT Risk Assessments**: Upload vendor documentation (PDF, DOCX, XLSX) and get a structured DORA gap analysis in minutes
- **Vendor Questionnaires**: Auto-generate and score vendor security questionnaires using LLM evaluation
- **Compliance AI Copilot**: Ask compliance questions in natural language — the copilot searches your documentation and DORA articles
- **Monitoring Alerts**: Automated 24-hour alerts for certification expiry, contract renewal, annual reviews overdue, and assessment gaps
- **Register of Information Export**: One-click EBA-compliant DORA Article 28(3) XLSX workbook (RT.01.01 → RT.04.01)
- **Multi-Tenant Architecture**: Secure workspace isolation with RBAC for multiple vendors and teams

## Platform Phases

The platform was built across four delivery phases:

| Phase | Feature | Status |
|-------|---------|--------|
| Phase 1 | DORA Copilot foundation — knowledge ingestion, vector search, conversational Q&A | ✅ Production |
| Phase 2 | Vendor document upload (PDF, DOCX, XLSX); DORA gap assessment UI | ✅ Production |
| Phase 3 | Vendor questionnaires with LLM scoring | ✅ Production |
| Phase 4 | Monitoring alerts + Register of Information export | ✅ Production |

## Key Features

### Intelligent RAG Pipeline

```
User Question → Query Rephrasing → Vector Retrieval → Dedup + Reranking
     → Context Compression → LLM Generation → Answer Validation (LLM judge)
```

### DORA Gap Analysis

The assessment worker analyses vendor ICT documentation against DORA articles and classifies coverage per article:

```
File Upload → Parse (PDF/DOCX/XLSX) → Semantic Chunking → Embed to Qdrant
     → LLM Gap Analysis per DORA Article → covered / partial / missing
```

### Automated Compliance Monitoring

A BullMQ repeatable job runs every 24 hours and sends email alerts to workspace owners:

- Certification expiry — 90 / 30 / 7 day thresholds
- Contract renewal — 60 days
- Annual review overdue
- No assessment in 12 months

### EBA Register of Information

`GET /api/v1/workspaces/roi-export` generates a 4-sheet XLSX workbook:

| Sheet | Content |
|-------|---------|
| RT.01.01 Summary | Institution summary + vendor counts by criticality tier |
| RT.02.01 ICT Providers | One row per vendor with contract, country, service type, tier, scores |
| RT.03.01 Certifications | One row per certification per vendor |
| RT.04.01 Gap Summary | One row per DORA gap from the latest complete assessment |

### Multi-Layer Security

- JWT-based authentication with refresh tokens
- Workspace-level authorization (RBAC — owner, member, viewer)
- Database-level tenant isolation (every query scoped to the caller's workspace)
- LLM output guardrails and confidence-based hallucination blocking (+ PII scanning)
- AES-256-GCM field-level encryption for sensitive data at rest

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Express 5, Node.js 20+ |
| AI Orchestration | LangChain (LCEL chains, prompts, parsers) + LangGraph (agentic assessment orchestration) |
| LLM | All calls routed through the **LiteLLM** gateway (OpenAI-compatible `/v1`); the gateway owns provider routing (Ollama Cloud, Azure OpenAI, Bedrock…), key rotation, retries/fallbacks, PII masking and budgets. Model/intent alias chosen per purpose via `LLM_MODEL` / `LLM_<purpose>_MODEL` |
| Embeddings | Self-hosted Ollama `bge-m3:latest` (1024-dim, 8192-token context); OpenAI `text-embedding-3-small` cloud fallback |
| Vector Store | Qdrant |
| Database | PostgreSQL (Drizzle ORM) |
| Cache / Queue | Redis, BullMQ |
| Real-Time | Socket.io |
| Frontend | Next.js 16, React 19, TypeScript |
| UI Components | shadcn/ui, Tailwind CSS |
| Monitoring | Langfuse (LLM traces + cost) · Prometheus / Grafana |
| Export | xlsx (XLSX workbook generation) |

## Architecture Overview

[![Retrieva architecture overview](/img/architecture/retrieva-overview.svg)](/img/architecture/retrieva-overview.svg)

*Browser (SSO) → Next.js frontend → Express 5 API (JWT · RBAC · per-workspace isolation) → capability
services (RAG/Copilot, Assessment, Questionnaire, RoI export) and BullMQ workers (ingest, questionnaire,
24h monitoring) → datastores (Qdrant vectors · PostgreSQL · Redis). All LLM/embedding calls go through
the governed **LiteLLM** gateway, traced in **Langfuse**. The diagram is [generated from code](https://github.com/andrelair-platform/retrieva/blob/main/docs/diagrams/retrieva_overview.py)
so it never drifts. For the detailed C4 container view, see [Architecture → Solution Architecture](/architecture/solution-architecture).*

## Quick Links

- [Getting Started](/getting-started) — Set up the platform locally
- [Architecture Overview](/architecture/overview) — Understand the system design
- [API Reference](/api/overview) — Explore the REST API
- [Background Workers](/backend/workers) — BullMQ worker reference
- [Environment Variables](/deployment/environment-variables) — Configuration reference
- [Security](/security/overview) — Security measures and RBAC
- [Deployment](/deployment/docker) — Deploy to production
