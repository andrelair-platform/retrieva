---
id: RTV-50-recursive-cte-repository
title: "Recursive-CTE traversal repository (the concentration/nth-party query pattern)"
status: Ready
type: Story
epic: datastore-migration
milestone: "RTV — Datastore migration (Postgres + Drizzle)"
estimate: 5
labels: [retrieva, cert, backend, database, domain-logic]
priority: P1
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **Backend Developer**, I want a typed recursive-CTE traversal repository so that the concentration / sub-outsourcing-chain reachability queries — the product-defining operation — are proven on Postgres+Drizzle and ready for the domain engine to build on.

## Background

Parent epic **RTV-45** (#520). This is the exact query that decided Drizzle over Prisma: a
`WITH RECURSIVE` traversal that stays *typed* in Drizzle. It's the substrate for RTV-28 (arrangement
graph) and RTV-32 (change-impact materiality).

## Acceptance Criteria

- [ ] AC-1: A repository/query module exposing typed graph traversals via Drizzle `sql\`WITH RECURSIVE …\`` — e.g. `providerSubcontractorChain(providerId)` and `arrangementsReachingFunction(functionId)`.
- [ ] AC-2: Results are **typed rows** (not `any`/raw) — the traversal output has a declared shape.
- [ ] AC-3: **Cycle-safe** (guards against subcontractor cycles; bounded depth) and indexed for the traversal edges.
- [ ] AC-4: Integration tests (testcontainers) on a seeded chain: N-hop reachability returns the correct set; a cycle terminates.
- [ ] AC-5: A short doc/example in `retrieva/docs` showing the pattern (feeds RTV-28/32 + the RNCP "I own my SQL" evidence).

## Technical Notes

- Depends on tables existing (RTV-48) but is written generically over the graph edges so RTV-28's arrangement/provider/subcontractor tables plug in.
- Keep the SQL readable + commented — this is a defensibility artifact, not just code.

## Definition of Done
- [ ] ACs met; recursive traversal typed + cycle-safe + tested; doc example added; parent RTV-45 (#520) updated

## Dependencies
- Parent: #520 (RTV-45); Depends on RTV-48
- Feeds: RTV-28 (arrangement graph), RTV-32 (change-impact)
