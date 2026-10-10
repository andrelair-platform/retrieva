---
sidebar_position: 1
---

# Architecture Overview

Retrieva is a DORA-compliance RAG platform. The core flow is: **upload vendor documents → AI-generated DORA gap analysis report → conversational Q&A**.

## Services

```
backend/     - Express 5 API server (ES modules, Node.js 20)
frontend/    - Next.js 16 App Router (React 19, TypeScript)
```

## Data Flow

### Gap Analysis Flow

```
User → Upload vendor PDF/DOCX/XLSX
     → assessmentController → assessmentQueue (BullMQ)
     → assessmentWorker:
         1. fileIndex: parse → embed chunks → Qdrant
         2. gapAnalysis: retrieve chunks → LLM generates DORA gap report
     → Assessment results stored in PostgreSQL
     → User downloads report or queries via chat
```

### RAG (Q&A) Flow

```
User Question → RAG Service
              → Embed query → Qdrant retrieval (k=15)
              → Cross-encoder re-ranking (top 5)
              → Context expansion (sibling chunks)
              → LLM generates answer with citations
              → Response streamed to frontend
```

## Model Hierarchy

```
Organization  (company account — e.g. "HDI Global SE")
└── OrganizationMember  (org_admin | analyst | viewer)
    └── User  (one user belongs to one org)
        └── Workspace  (vendor isolation boundary — scoped to org)
            └── Assessment (per vendor DORA evaluation)
                └── DocumentSource (indexed chunks in Qdrant)
```

### Organization-First B2B Model

All vendor workspaces are scoped to an `Organization`. When a user belongs to an org, they automatically see every workspace that shares the same `organizationId` — no per-workspace invitation is required. Org-level roles map to workspace permissions:

| Org role | Workspace access |
|----------|-----------------|
| `org_admin` | owner-level (can invite, configure, query) |
| `analyst` | member-level (can query, view sources) |
| `viewer` | viewer-level (read-only) |

Legacy users without an `organizationId` fall back to the previous per-workspace `WorkspaceMember` access model.

## Backend Request Flow

```
Routes → Middleware (authenticate, requireWorkspaceAccess, validateBody)
       → Controllers (thin — parse HTTP, call service, send response)
       → Services (business logic) → Repositories (Drizzle) → PostgreSQL
                                   → BullMQ queues
                                   → Qdrant (vector store)
```

## Key Components

### Controllers
| Controller | Responsibility |
|-----------|----------------|
| `assessmentController.js` | Upload files, start gap analysis, retrieve results |
| `ragController.js` | Conversational Q&A over indexed documents |
| `workspaceMemberController.js` | Workspace CRUD + member management |
| `organizationController.js` | Organization creation, team invitations, member management |
| `authController.js` | Register, login, logout, token refresh |
| `conversationController.js` | Conversation history management |
| `exportController.js` | RoI export (DORA Art. 28 Excel workbook) |
| `healthController.js` | Service health checks |

### Workers (BullMQ)
| Worker | Queue | Purpose |
|--------|-------|---------|
| `assessmentWorker.js` | `assessmentJobs` | Orchestrates file indexing + DORA gap analysis; idempotency guard skips already-indexed documents on retry |
| `monitoringWorker.js` | `monitoringJobs` | 24-hour schedule: compliance threshold alerts |

### Key Services
| Service | Purpose |
|---------|---------|
| `services/rag.js` | Core RAG pipeline: retrieval, re-ranking, answer generation |
| `services/AssessmentService.js` | Assessment business logic: create, list, get, delete, risk decisions, clause sign-offs |
| `services/WorkspaceService.js` | Workspace CRUD, member invitation and revocation |
| `services/alertMonitorService.js` | Compliance threshold checks and alert delivery via repositories |
| `services/roiExportService.js` | EBA-compliant DORA Art. 28(3) XLSX workbook |
| `services/fileIngestionService.js` | Parses PDF, DOCX, XLSX; deterministic Qdrant point IDs (SHA-256) |
| `services/emailService.js` | Transactional email via Resend HTTP API |
| `services/storageService.js` | File backup via DigitalOcean Spaces (S3-compatible) |

### Repository Layer
| Repository | Purpose |
|-----------|---------|
| `repositories/AssessmentRepository.js` | Assessment queries: `findByWorkspaces`, `markDocumentIndexed`, `completeAnalysis`, `findLatestByWorkspace` |
| `repositories/WorkspaceRepository.js` | Workspace queries: `findByOrganization`, `findWithCertifications`, `findDueForReview`, `findByContractEndingSoon` |
| `repositories/MessageRepository.js` | Message persistence |
| `repositories/ConversationRepository.js` | Conversation management |

All repositories extend `BaseRepository` (`repositories/BaseRepository.js`) which provides common CRUD, pagination, and aggregation operations.

### Configuration
| Module | Purpose |
|--------|---------|
| `config/llmProvider.ts` | Chat LLM client → the AI gateway (LiteLLM, OpenAI-compatible) |
| `config/embeddingProvider.ts` | Ollama `bge-m3` embeddings (OpenAI fallback) |
| `config/tracing.ts` | Langfuse (traces, prompt management, feedback) |
| `config/vectorStore.js` | Qdrant client + collection management |
| `config/queue.js` | BullMQ queue definitions |
| `config/db.ts` | PostgreSQL (pg Pool) connection + migrations on boot |
| `config/redis.js` | Redis connection (BullMQ + RAG cache) |

## Infrastructure

```
                 ┌─────────────┐
  HTTPS ─────→  │    Nginx    │
                 └──────┬──────┘
              ┌─────────┴──────────┐
              ↓                    ↓
        ┌──────────┐        ┌──────────┐
        │ Frontend │        │ Backend  │
        │ :3000    │        │ :3007    │
        └──────────┘        └────┬─────┘
                           ┌─────┼──────┐
                           ↓      ↓      ↓
                      PostgreSQL Redis Qdrant
```

**Production** (self-hosted **minicloud** k3s, GitOps via ArgoCD + Kargo):
- ingress-nginx + cert-manager TLS (Cloudflare tunnel for public access)
- **PostgreSQL** (CNPG on k8s; Drizzle migrations on boot)
- Qdrant (vector store) · Redis 7 (cache + BullMQ)
- Object storage: MinIO / Cloudflare R2
- **LLM via the minicloud LiteLLM AI gateway** (routing, PII masking, budgets, EU governance) · embeddings on self-hosted Ollama `bge-m3`

## Multi-Tenancy

Workspace/organization isolation. Every Qdrant query filters by `workspaceId`; relational queries compose `entityScopeCondition` (Drizzle) and run entity-scoped under `ENTITY_ISOLATION_MODE=enforce` (defense-in-depth at both the DB and vector-store layers).

## LLM Provider Abstraction

`config/llmProvider.ts` is a thin OpenAI-compatible client over the platform **AI gateway (LiteLLM)** — the single provider. The gateway owns provider routing (Ollama Cloud, Azure, Bedrock…), key rotation, retries/fallbacks, PII masking, budgets and EU governance. Callers pick a **model name / intent alias** (e.g. `tier-premium`, `tier-standard`) via `purpose` / `LLM_MODEL`; the gateway resolves it. Config: `LITELLM_BASE_URL` + `LITELLM_API_KEY`.
