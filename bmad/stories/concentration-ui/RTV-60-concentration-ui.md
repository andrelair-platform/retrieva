---
id: RTV-60-concentration-ui
title: "Concentration & nth-party graph UI (DORA Art. 29)"
status: Done
type: Story
epic: concentration
milestone: "RTV — DORA ICT-TPRM domain model"
estimate: 8
labels: [retrieva, cert, frontend, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As an **ICT risk officer**, I want an in-app **concentration & nth-party dependency** view over the
whole firm's providers, so that I can see single points of failure and provider/substrate
concentration (DORA Art. 29) and confirm AI-extracted sub-provider edges — not just read a static
Register.

## Background

The `retrieva-backend` **concentration module** (`modules/concentration/`, org-scoped, spans all
vendors) is fully built and has **no in-app frontend consumer** — the only "concentration" UI today is
the marketing `ConcentrationGraphHero` animation. This story wires the real dashboard.

Backend endpoints (all `/api/v1/concentration`, org-scoped):
- `GET /` — analysis: providers, **SPOF**, substrate, coverage metrics.
- `GET /graph` — viz-ready `{ nodes, edges }` for the dependency graph.
- `GET /functions` · `POST /functions` · `DELETE /functions/:id` — firm-owned **critical functions**.
- `GET /dependencies` · `PATCH /dependencies/:id` — **nth-party** edges + human confirmation of
  AI-extracted ones.
- `POST /extract/:workspaceId` — auto-extract sub-provider edges from a vendor's docs (unconfirmed).

Supersedes the legacy roadmap issues #300 (portfolio concentration analytics), #350 (subcontractor +
concentration view), #207 (delivery regions / sub-providers) — those predate the arrangement model;
close/link them once this lands.

## Acceptance Criteria

- [x] AC-1: A `/concentration` dashboard route + nav entry, gated by auth; reachable from the app shell.
- [x] AC-2: **Concentration KPIs** from `GET /concentration` — providers count, SPOFs, top providers by
      dependency, substrate concentration, coverage — rendered as summary cards (honest labels, no
      invented scores).
- [x] AC-3: **Dependency graph** from `GET /concentration/graph` (nodes + edges). Reuse/adapt the
      existing `ConcentrationGraphHero` viz as the base rather than a new graph lib.
- [x] AC-4: **nth-party dependencies** list from `GET /dependencies`; an AI-extracted (unconfirmed) edge
      can be **confirmed** via `PATCH /dependencies/:id` (optimistic, invalidates the query). Unconfirmed
      edges are visually distinct.
- [x] AC-5: **Critical functions** management — list (`GET /functions`), create/update
      (`POST /functions`), delete (`DELETE /functions/:id`), with the standard form + confirm patterns.
- [x] AC-6: Errors surface via `getErrorMessage` + toast (mirror the arrangements feature); loading =
      skeletons; empty states explain what to do (e.g. "no dependencies extracted yet").
- [x] AC-7: A typed `concentrationApi` client + query hooks (mirror `features/arrangements/`), and
      vitest for the api client calls (endpoints + payloads).

## Technical Notes

- Follow the `features/arrangements/` shape: `api/concentration.ts`, `queries/`, `components/`.
- The extraction trigger (`POST /extract/:workspaceId`) is **optional** in this story — include a
  "re-extract" action if cheap, else defer to a follow-up; keep the story shippable without it.
- Concentration is deliberately org-wide (not per-workspace) — do not add workspace scoping.
- i18n: add EN + FR strings (this app is bilingual).

## Definition of Done

- [x] ACs met; `npm run build` + eslint + vitest green; matches the arrangements feature conventions
- [ ] Legacy concentration issues (#300 / #350 / #207) linked or closed as superseded
- [ ] Screens verified against dev data (or seeded fixtures) — KPIs + graph + confirm flow work

## Dependencies

- Backend concentration module (already shipped). No backend change expected; if the graph payload
  needs a field for the viz, raise a small `retrieva-backend` follow-up rather than widening scope here.
