# Retrieva

**DORA Compliance Intelligence for Financial Entities**

Retrieva automates third-party ICT risk assessments under **DORA (Regulation EU 2022/2554)**: upload
vendor documentation, get a structured compliance gap report in minutes, and ask follow-up questions to
an AI copilot grounded on your documents and the built-in DORA knowledge base.

**Docs:** [andrelair-platform.github.io/retrieva](https://andrelair-platform.github.io/retrieva/) · **Live:** [retrieva.online](https://retrieva.online)

> **Repo layout (post-split, RFC #474).** This repository is the **frontend** (Next.js) + the docs +
> the local-run `docker-compose.yml`. The **backend** (Express 5 + Drizzle/PostgreSQL + LangChain RAG API)
> lives in **[andrelair-platform/retrieva-backend](https://github.com/andrelair-platform/retrieva-backend)**.
> The one-command local run below builds both.

---

## 🚀 Run the whole application locally (reviewers / certification jury)

This is the recommended way to evaluate Retrieva: **one command, zero config, no API key, no cluster.**
Everything (database, vector store, queue, AI models, backend, frontend) runs in Docker on your machine.

### Prerequisites

- **Docker Desktop** (or Docker Engine + Compose v2) — that's the only requirement.
- **git**, and **~8 GB free disk + ~6 GB free RAM** (a small chat LLM runs locally).

### 1. Clone BOTH repos **side by side** (same parent folder)

```bash
mkdir retrieva-eval && cd retrieva-eval
git clone https://github.com/andrelair-platform/retrieva.git
git clone https://github.com/andrelair-platform/retrieva-backend.git
```

You should have:

```
retrieva-eval/
├── retrieva/            # this repo (frontend + docker-compose.yml)
└── retrieva-backend/    # the API (built automatically by compose)
```

### 2. Start everything

```bash
cd retrieva
docker compose up
```

That single command:
1. starts **PostgreSQL, Redis, Qdrant, Ollama**;
2. pulls the **AI models** (`bge-m3` embeddings + `llama3.2:3b` chat) — *first run only, ~2–3 GB*;
3. builds + starts the **backend** (it **auto-applies database migrations** on boot);
4. runs a one-shot **seed** of the DORA knowledge base + control library;
5. builds + starts the **frontend**.

> **First run takes a few minutes** (model download + image builds). Later runs start in seconds.
> When you see the frontend become healthy, you're ready.

### 3. Open the app

Go to **[http://localhost:3000](http://localhost:3000)** → register an account → create a workspace →
upload a vendor document (PDF/DOCX) to run your first DORA gap analysis, or ask the copilot a question.

### AI model — keyless by default, optional free key for speed

The chat/copilot runs **100 % locally on Ollama** (no key, works offline). On a modest laptop the local
model can be slow. **For faster answers (optional)**, create a `.env` file **next to `docker-compose.yml`**
(`retrieva/.env`) with a free provider key, then `docker compose up` again:

```bash
# retrieva/.env  — optional, for faster chat responses
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_free_groq_key
# (alternatively: OLLAMA_BASE_URL=https://ollama.com + OLLAMA_API_KEY=...)
```

Embeddings always run locally (`bge-m3`), so document ingestion never needs a key.

### Ports & services

| Service | URL / Port | Role |
|---|---|---|
| Frontend | http://localhost:3000 | the app you use |
| Backend API | http://localhost:3007 | REST + RAG (`/health`, `/api/v1`) |
| PostgreSQL | localhost:5432 | application data (Drizzle) |
| Qdrant | localhost:6333 | vector store |
| Redis | localhost:6378 | cache / BullMQ queues |
| Ollama | localhost:11434 | local chat + embedding models |

### Troubleshooting

```bash
docker compose logs -f backend        # watch backend (migrations, boot)
docker compose logs -f seed           # watch the DORA knowledge-base seeding
docker compose ps                     # service health
docker compose down -v && docker compose up   # full clean reset (wipes volumes)
```

- **A port is already in use** → stop the conflicting local service, or edit the `ports:` in `docker-compose.yml`.
- **Copilot answers slowly / times out** → use the optional free key above (local LLM is CPU-bound).
- **Re-run the knowledge-base seed** → `docker compose run --rm seed`.

---

## Architecture

```
            ┌──────────────┐            ┌──────────────┐
 Reviewer ─▶│   Frontend   │ ── API ──▶ │   Backend    │   (this repo)   (retrieva-backend)
 (browser)  │  Next.js 16  │            │  Express 5   │
            └──────────────┘            └──────┬───────┘
                                               │
                 ┌──────────────┬──────────────┼──────────────┐
                 ▼              ▼               ▼              ▼
          ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
          │ PostgreSQL │ │   Qdrant   │ │   Redis    │ │   Ollama   │
          │ (Drizzle)  │ │ (vectors)  │ │ (queue)    │ │ (LLM+embed)│
          └────────────┘ └────────────┘ └────────────┘ └────────────┘
```

**Gap analysis:** `upload → BullMQ worker → parse → chunk → embed (bge-m3) → Qdrant → LLM gap analysis → structured report`
**RAG Q&A:** `question → multi-query + HyDE → Qdrant (k=15) → cross-encoder re-rank (RRF) → LLM answer + citations`

> **Production** runs on the self-hosted **minicloud k3s** cluster via **GitOps (ArgoCD + Kargo)** —
> not via this compose (which is for local evaluation/dev only).

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Query |
| Backend | Express 5, Node.js 20, BullMQ, LangChain (LCEL) |
| Database | **PostgreSQL + Drizzle ORM** |
| Vector store | Qdrant |
| Cache / queue | Redis, BullMQ |
| LLM (chat) | Ollama (local by default) · pluggable to Groq / OpenAI / Anthropic / Ollama Cloud |
| Embeddings | self-hosted Ollama `bge-m3` (1024-dim) |
| Auth | JWT (httpOnly cookies), bcrypt, AES-256 field encryption |
| Observability | Langfuse (LLM traces + cost) · Prometheus / Grafana |
| Delivery | Docker, GHCR, GitHub Actions CI/CD, ArgoCD + Kargo (GitOps on minicloud k3s) |

---

## Features

| Feature | Description |
|---|---|
| **DORA gap analysis** | Upload vendor ICT docs → structured report with Critical/High/Medium/Low gaps mapped to DORA articles |
| **Multi-source ingestion** | PDF / DOCX / XLSX upload, URL crawling — indexed into a per-tenant vector store |
| **DORA copilot (RAG Q&A)** | Natural-language compliance questions, grounded on your docs + the DORA knowledge base, with citations |
| **Workspace isolation** | Multi-tenant: each workspace isolated at the DB and vector-store layer |
| **Enterprise security** | PII masking, prompt-injection detection, output sanitisation, httpOnly JWT, AES-256 field encryption |

---

## Frontend development (this repo)

For UI-only work you can run just the frontend against a running backend:

```bash
npm install            # root npm workspace (installs frontend deps)
npm run dev            # Next.js dev server on http://localhost:3000
npm run lint
npm test
```

Backend development lives in **[retrieva-backend](https://github.com/andrelair-platform/retrieva-backend)**
(its own README, tests and scripts).

---

## Documentation

Full documentation (architecture, security, API reference, and the **RNCP39583 certification** dossier)
is published at **[andrelair-platform.github.io/retrieva](https://andrelair-platform.github.io/retrieva/)**.

## License

MIT — see [LICENSE](LICENSE).
