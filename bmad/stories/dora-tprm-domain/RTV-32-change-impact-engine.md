---
id: RTV-32-change-impact-engine
title: "EPIC: Change & impact engine (diff funnel → semantic → graph-materiality)"
status: Ready
type: Epic
epic: dora-tprm-domain
estimate: 21
labels: [epic, retrieva, cert, domain-logic, ai]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Epic

As an **ICT risk analyst**, I want provider changes analysed once and their business impact evaluated per affected arrangement via the graph, so that a subprocessor/region/SLA change doesn't force a human to re-read 150 pages and redo 80 controls.

## Why

This is the highest long-term value and the thing spreadsheets cannot do: materiality is a **graph traversal** — the same change is 🔴 if it reaches a critical function (Claims Copilot / claims data) and 🟢 if it hits a dev sandbox. The noise funnel (hash/version → structural diff → relevant-section → only-then semantic LLM) keeps it cheap and trustworthy (reuses the RTV-14 ingestion + LLMOps cost discipline).

## Scope / Acceptance (epic-level)

- [ ] **Diff funnel**: source ingest → hash/version detection → structural diff → relevant-section filter → **only then** semantic LLM analysis (a CSS change never reaches the LLM).
- [ ] Change classified (type: subprocessor added / region / contractual / SLA / architecture / incident) with old→new.
- [ ] **Control mapping**: which DORA controls the change potentially affects (via RTV-29).
- [ ] **Graph-derived materiality** = f(change type, reachability to a critical/important function, data classes crossed) → routes Low (log) / Medium (analyst) / High (Risk+Legal+DPO).
- [ ] **Honest trigger sourcing**: v1 is semi-automated — scheduled subprocessor-list ingest + **contractual-email inbox** as the reliable signal; scraping best-effort, no "magic detection" promised.
- [ ] Change analysed **once**; impact evaluated **per affected arrangement/entity**; incident feeds auto-open a review.

## Dependencies
- Depends on: RTV-28 (graph), RTV-29 (controls), RTV-14 (ingestion).
- v1 = minimal (semi-automated sources); deeper automation later.
