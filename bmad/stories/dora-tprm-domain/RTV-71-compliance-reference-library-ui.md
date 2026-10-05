---
id: RTV-71-compliance-reference-library-ui
title: "Surface the DORA compliance reference library in the UI (4 orphaned endpoints)"
status: Ready
type: Story
epic: dora-tprm-domain
estimate: 5
labels: [retrieva, cert, frontend, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As a **compliance owner / analyst**, I want to browse the DORA article corpus **inside Retrieva** and see *which DORA article* a control, finding, or clause maps to — so that I don't leave the app to look up the regulation, and every assessment verdict is traceable to the text it's based on.

## Why

The backend already serves a **complete DORA/RTS reference knowledge base** — 4 authenticated endpoints backed by `data/compliance/dora-articles.json` (base DORA + EBA/ESMA/EIOPA technical standards, with version + `lastVerified` + sources) — but **nothing in the frontend calls it**. There is no `complianceApi` client and no page. It is the clearest case of *"built, valuable, invisible"* from the wiring audit (2026-10-05).

This is a cheap, high-leverage win: the endpoints are read-only and already return structured, versioned data. Surfacing it (a) gives the product a credible "we know the regulation" surface, (b) lets us add **article tooltips/links** next to findings and clause sign-offs (the assessment engine already references DORA articles), and (c) makes the KB's `lastVerified` / `nextReviewDate` visible — which is **MCO / freshness evidence for BC04**.

## Backend (already exists — do NOT rebuild)

All under `/api/v1/compliance`, `authenticate` only (shared reference data, no workspace scope) — `retrieva-backend/routes/complianceRoutes.ts` + `controllers/complianceController.ts`:

| Method + path | Returns |
|---|---|
| `GET /compliance/metadata` | `{ version, lastVerified, nextReviewDate, sources, stats:{ totalEntries, byRegulation } }` |
| `GET /compliance/domains` | DORA domains with article counts |
| `GET /compliance/articles?domain=&chapter=I..VI&regulation=DORA\|DORA-RTS` | filtered article list |
| `GET /compliance/articles/:article` | single article (`"Article 30"` or `"Article-30"`) |

## Scope / Acceptance

- [ ] **New frontend API client** `frontend/src/features/compliance/api/compliance.ts` wrapping the 4 endpoints (follow the existing `features/*/api/*.ts` shape; paths are relative to `/api/v1`).
- [ ] **Reference-library page** `features/compliance/` listing domains → articles, with filters (domain, chapter I–VI, regulation DORA vs DORA-RTS) and an article detail view (full text + source).
- [ ] **Routed + in nav:** register the page under `app/(dashboard)/` and add a nav entry in `shared/constants/nav-items.ts` (Compliance section) — so it's actually reachable (the audit found reachability is otherwise healthy; don't leave this one unrouted).
- [ ] **KB freshness surfaced:** show `version` + `lastVerified` + `nextReviewDate` from `/metadata` somewhere on the page (small "knowledge base reviewed …" line) — this is the MCO evidence.
- [ ] **Article cross-link (lightweight):** where a finding / clause sign-off already shows a DORA article string (assessment detail), make it link/tooltip to the matching article via `GET /compliance/articles/:article`. (If the detail surface is awkward, deliver this as a follow-up and note it — the standalone page is the must.)
- [ ] No backend change. Read-only feature.

## Notes

- There is **no feature-flag gating** in the frontend (audit confirmed), so once routed + in nav it's live.
- `:article` accepts both `"Article 30"` and `"Article-30"` — URL-encode or use the hyphen form in links.
- Keep it a thin read surface; the value is traceability + freshness, not a CMS.

## Dependencies

- Backend: none (endpoints live). Relates to the assessment engine (findings/clauses reference DORA articles) for the cross-link.
