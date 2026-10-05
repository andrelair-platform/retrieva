---
id: RTV-74-auto-openapi-api-docs
title: "Auto-generate OpenAPI + serve /api-docs from zod schemas (replace drift-prone hand-written API docs)"
status: Ready
type: Story
epic: dora-tprm-domain
estimate: 8
labels: [retrieva, cert, backend, documentation]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As a **developer / integrator / auditor of Retrieva**, I want a **live, always-accurate API reference at `/api-docs`** generated from the code, so that every one of the backend's endpoints is discoverable and correct — instead of a hand-maintained set of pages that is half-missing and partly wrong.

## Why — the docs are installed-but-unwired, and the hand-written fallback is ~50% + inaccurate

From the API-docs gap audit (2026-10-05):

- **The tooling is already installed but never used.** `package.json` has `swagger-ui-express@^5.0.1` and `@asteasolutions/zod-to-openapi@^8.4.0`. The only reference to `/api-docs` is in `config/httpLogger.ts:20` (it excludes the path from logging) — **nothing mounts a spec or a UI**, so `/api-docs` 404s. There is **no OpenAPI spec file** anywhere in the repo.
- **116 endpoints are live** across the mounted routers; the hand-written `docs/api/` (7 domain pages) covers only ~58 (~50%).
- **The entire DORA core is undocumented:** arrangements CRUD + graph (17), assessment engine (5), concentration/nth-party (8), register/RoI (2), decision-queue (2), intake (3), evidence library (4), questionnaires (6+3). The docs cover generic scaffolding (auth, workspaces, chat) and miss the product.
- **The hand-written docs are partly *wrong*** — they list endpoints that don't exist: `GET`/`DELETE /conversations/:id/messages`, `POST /rag/query`, `POST /ragas/evaluate` (the real `ragRoutes` only has `/rag` + `/rag/stream`). They drift in both directions.

The fix: generate the spec from the **zod schemas the routes already validate with** → 116/116 by construction, can't drift. This also produces the artifact that **L3 contract tests** consume (the testing standard already does this against policy-service's OpenAPI — `testing.md`). Strong **BC02 (concevoir)** + **BC03 (déployer & sécuriser)** cert evidence: a documented, contract-tested API surface.

## Current zod base (reuse it — don't rewrite schemas)

- Middleware `middleware/validate.ts` (`validate` / `validateBody` / `validateParams`) all take zod schemas.
- Schemas already exist: `validators/schemas.ts` (auth — registerSchema/loginSchema/…), `modules/*/*.schema.ts` (e.g. `concentration.schema.ts`), workspace routes. These feed `zod-to-openapi` directly.
- Gap: GET routes and some older controllers have **no** zod schema → registered with a minimal/path-only definition now, backfilled over time (backfilling a schema also tightens validation — a win, not throwaway work).

## Scope / Acceptance

- [ ] **OpenAPI registry + generator.** Add an `openapi/` module: an `OpenAPIRegistry` (from `@asteasolutions/zod-to-openapi`), extend zod with `.openapi()` (call `extendZodWithOpenApi(z)` once at boot), and a `generateOpenApiDocument()` using `OpenApiGeneratorV3` → an OpenAPI 3.0 doc (title/version from `package.json`, servers = `/api/v1`).
- [ ] **Register every mounted route** (method + path + params/body/response) grouped by **tag per domain** (auth, workspaces, organizations, assessments, conversations, rag, compliance, arrangements, arrangement-graph, arrangement-assessment, concentration, register, decision-queue, intake, evidence, questionnaires, billing, public). Reuse existing zod schemas; register schema-less routes with a minimal path entry (tracked list in the story output, not silently skipped).
- [ ] **Security schemes documented:** the cookie/JWT `authenticate` + `optionalAuth` posture, and the public **token** routes (`/questionnaires/respond/:token`, `/public/evidence/:token`) marked as unauthenticated.
- [ ] **Mount Swagger UI** at `GET /api-docs` (via `swagger-ui-express`) and expose the raw spec at `GET /api-docs.json`. Keep it **behind the same access posture as the app** (not world-open in prod) — decide: authenticated, or dev-only; document the choice.
- [ ] **Spec is complete:** a test asserts **every** router's registered routes appear in the generated spec — so a new route without a spec entry **fails CI** (this is what makes it non-drifting). Target: 116/116 (minus intentionally-excluded health).
- [ ] **L3 contract hook:** emit `openapi.json` as a build artifact and add at least one **contract test** (schemathesis or an openapi-validator pass) against the spec — satisfies the Tier-A L3 layer for this service (`testing.md`).
- [ ] **Replace the drift-prone hand-written pages.** In `retrieva/docs/docs/api/`: remove the stale per-domain `.md` pages (and the 3 bogus endpoints) and either (a) embed the generated spec in the Docusaurus site (redocusaurus/scalar) or (b) replace them with a single page linking to the live `/api-docs`. Keep `overview.md`, `rate-limiting.md`, `error-handling.md` (narrative, not endpoint lists).
- [ ] **Quick correctness win regardless:** even if (a)/(b) is deferred, delete/annotate the 3 nonexistent documented endpoints (`conversations/:id/messages` GET+DELETE, `rag/query`, `ragas/evaluate`) so the docs stop actively misleading.

## Notes / design

- **Why generate, not hand-write:** a hand-written list is already 50% + wrong after a few sprints; generation from zod is the only thing that stays 116/116. This is the same lesson as the wiring audit — keep the source of truth in the code.
- **Incremental is fine:** land the registry + UI + the completeness test first (schema-less routes get minimal entries); backfill richer request/response schemas per domain in follow-ups. The completeness test guarantees no endpoint is missing even before every schema is rich.
- Relates to the hand-written docs this replaces: `retrieva/docs/docs/api/*`.

## Dependencies

- Backend only. No new deps (both libraries already installed). Relates to the testing standard's L3 contract layer and the per-repo Docusaurus convention.
