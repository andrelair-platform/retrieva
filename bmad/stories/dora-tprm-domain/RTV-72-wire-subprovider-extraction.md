---
id: RTV-72-wire-subprovider-extraction
title: "Wire sub-provider AI auto-extraction into the concentration page (\"the graph builds itself\")"
status: Ready
type: Story
epic: dora-tprm-domain
estimate: 3
labels: [retrieva, cert, frontend, ai, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As a **compliance owner**, I want to trigger **AI sub-provider extraction** from a vendor's documents directly from the concentration page, so that the nth-party dependency graph **grows itself** from the evidence I already uploaded — instead of me hand-entering every subcontractor.

## Why

This is the headline *"Retrieva IS the graph"* / *"the graph builds itself"* feature, and **the backend is fully built and live** — but there is **no way to trigger it from the UI** (wiring audit, 2026-10-05). Today the concentration page already **consumes** the resulting graph and already has the **human-confirm** flow for AI-extracted edges (`PATCH /concentration/dependencies/:id`). The only missing piece is the **button that calls the extraction endpoint**. So the graph can currently only grow by manual entry — the most compelling automation in the product is invisible.

It directly embodies the **propose → confirm** model (RTV-34): the extractor creates edges as `source: 'extracted'`, `confidence: 0.7`, **`confirmed: false`** (so they do NOT affect concentration scoring until a human accepts them), idempotent (skips existing edges). That human-accountability + AI-automation combo is strong **BC02** cert evidence.

## Backend (already exists — do NOT rebuild)

- `POST /api/v1/concentration/extract/:workspaceId` — `retrieva-backend/modules/concentration/concentration.routes.ts` + `concentration.controller.ts:78` (`extractSubProviders`) → `services/concentrationService.ts:339` (`extractSubProvidersForWorkspace`).
- It retrieves the vendor's doc chunks (latest complete assessment's Qdrant collection), runs one LLM extraction, and creates **unconfirmed** parent→child edges. Returns `{ created, candidates }`.
- ORG-scoped (keys off `req.user.organizationId`); `workspaceId` validated by `extractParam`.
- The resulting unconfirmed edges already appear in `GET /concentration/dependencies` and are confirmable via `PATCH /concentration/dependencies/:id` — **both already wired** in the UI.

## Scope / Acceptance

- [ ] **Add the API fn** `extractSubProviders(workspaceId)` → `POST /concentration/extract/:workspaceId` in `frontend/src/features/concentration/api/concentration.ts`.
- [ ] **Add a trigger in the UI** on `features/concentration/components/concentration-page.tsx` — a per-vendor (or scoped) **"Scan vendor docs for sub-providers"** action that calls the fn for the chosen workspace.
- [ ] **Feedback:** on success show the returned `{ created }` count (e.g. toast: "N new sub-provider edges proposed — review below"); handle the `created: 0 / no docs` case gracefully ("no vendor documents indexed yet").
- [ ] **Refetch** the dependency list (invalidate the concentration/dependencies query via `use-concentration-query.ts`) so the new **unconfirmed** edges appear immediately in the existing confirm flow — proposed edges must be visually distinct from confirmed ones (they likely already are; verify).
- [ ] **No scoring leak:** confirm (manually, in QA) that freshly extracted edges are `confirmed: false` and do NOT move the concentration/SPOF numbers until accepted — the whole point of propose→confirm.
- [ ] Respect the extraction only running where the vendor has an indexed assessment (the service returns `{created:0}` otherwise — surface that, don't error).
- [ ] No backend change.

## Notes

- Extraction can take several seconds (retrieval + LLM) — show a pending state; it's synchronous (`catchAsync` handler), not a queued job.
- Idempotent: re-running won't duplicate edges, so a second scan is safe.
- `source: 'extracted'` + `confidence: 0.7` are available on the edge for display if useful.

## Dependencies

- Backend: none (endpoint + service live). Builds on the already-wired `GET /concentration/dependencies` + `PATCH …/:id` confirm flow. Same propose→confirm model as RTV-34 / RTV-70.
