---
sidebar_position: 2
---

# Getting Started

Retrieva is split across two repos (post-split, RFC #474): **`retrieva`** (this repo — frontend + docs
+ the local-run `docker-compose.yml`) and **`retrieva-backend`** (Express + Drizzle/PostgreSQL + the RAG
API). The fastest way to run the whole thing is the one-command Docker stack below.

## Fastest path — run the whole app (recommended)

One command, no API key, no cluster. Clone **both** repos side by side, then start the stack:

```bash
mkdir retrieva-eval && cd retrieva-eval
git clone https://github.com/andrelair-platform/retrieva.git
git clone https://github.com/andrelair-platform/retrieva-backend.git
cd retrieva && docker compose up
```

This starts PostgreSQL, Redis, Qdrant, Ollama (chat + `bge-m3` embeddings), the backend (which
**auto-applies Drizzle migrations** and seeds the DORA knowledge base) and the frontend. First run
pulls the AI models (~2–3 GB). Then open **[http://localhost:3000](http://localhost:3000)**.

Full details, ports and troubleshooting: the
[README run section](https://github.com/andrelair-platform/retrieva#-run-the-whole-application-locally-reviewers--certification-jury).

:::note AI model — keyless by default
Chat runs through an OpenAI-compatible **AI gateway (LiteLLM)**; the local run points it at the local
Ollama endpoint, so it works **keyless and offline**. For faster answers, set `LITELLM_BASE_URL` +
`LITELLM_API_KEY` + `LLM_MODEL` in `retrieva/.env` (e.g. a free Groq key). Embeddings always run locally.
:::

## Prerequisites

- **Docker Desktop** (or Docker Engine + Compose v2) — for the full-stack run above.
- **Node.js 20+** and **npm 10+** — only for frontend-only development (below).
- ~8 GB free disk + ~6 GB free RAM (a small chat model runs locally).

## Frontend-only development (this repo)

For UI work you can run just the frontend against a running backend:

```bash
npm install            # root npm workspace (installs frontend deps)
npm run dev            # Next.js dev server → http://localhost:3000
npm run lint
npm test
```

Frontend env (`frontend/.env.local`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:3007/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3007
NEXT_PUBLIC_APP_NAME=Retrieva
```

## Backend development

The backend lives in **[retrieva-backend](https://github.com/andrelair-platform/retrieva-backend)**
(its own README, tests and scripts). Key facts: Express 5 + Drizzle/PostgreSQL; `DATABASE_URL`,
`REDIS_URL`, `QDRANT_URL`, `LITELLM_BASE_URL`/`LITELLM_API_KEY` (AI gateway) + `EMBEDDING_OLLAMA_BASE_URL`;
migrations are applied automatically on boot. See [Environment Variables](/deployment/environment-variables).

## First Login and Onboarding

Retrieva uses an **organization-first B2B model**. Every user belongs to a company account before
accessing the dashboard.

### Scenario A — Creating a new organization (first user / CRO)

1. Register at `/register` — no invite token needed
2. You are redirected to `/onboarding`
3. Fill in your company name, industry, and country → submit
4. You land on `/assessments`, with your company name above the workspace switcher
5. Go to Settings → Team to invite colleagues

### Scenario B — Joining via invite (team member)

1. An admin invites you via Settings → Team → Invite → your email address
2. You receive an email: *"… invited you to join … on Retrieva"*
3. Click the link → `/join?token=XXX`
4. If not registered yet, you're redirected to `/register?token=XXX&email=you@company.com` (email pre-filled)
5. Complete registration → you land on `/assessments`; all org workspaces are immediately visible

:::info Role mapping
Your org role (`org_admin`, `analyst`, `viewer`) maps to workspace permissions automatically. See the
[API Reference](/api/overview) (the live OpenAPI docs) for the organizations endpoints.
:::

## Next Steps

- [Architecture Overview](/architecture/overview) — understand the system design
- [API Reference](/api/overview) — the live, auto-generated OpenAPI docs
- [Background Workers](/backend/workers) — BullMQ worker reference
- [Environment Variables](/deployment/environment-variables) — full configuration reference
