---
id: RTV-38-register-projection
title: "Register of Information projection/export (RT.02.01) from the graph"
status: Ready
type: Story
epic: dora-tprm-domain
milestone: "RTV — DORA ICT-TPRM domain model"
estimate: 5
labels: [retrieva, cert, backend, domain-logic, api]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **compliance officer**, I want the DORA Register of Information generated as a projection of the arrangement graph so that I never hand-maintain a spreadsheet and the Register is always current.

## Background

Parent epic **RTV-28** (#499). ADR §2: RT.02.01 is ~15 linked tables = the graph. The Register is a **projection/export**, not a form.

## Acceptance Criteria

- [ ] AC-1: A read model that assembles the RT.02.01 templates from the graph (entity, arrangements, functions supported, provider, subcontracting chain, assessment status).
- [ ] AC-2: Export to the EBA RT.02.01 structure (the key templates: B_01 entity, B_02 arrangements, B_03 intra-group, B_05 provider, subcontracting) — CSV/XLSX per template.
- [ ] AC-3: The export is **generated on demand from live graph state** (no separate stored copy that can drift).
- [ ] AC-4: Fields sourced from the models in RTV-36/37; missing required fields surface as **gaps**, not silent blanks.
- [ ] AC-5: vitest + a golden-file test of the export for a seeded 1-entity fixture.

## Technical Notes

- Target the **current** EBA RT.02.01 template structure; keep the field map in one place (versioned) so template updates are a config change.
- Reshapes the placeholder RTV-18 (#320) — link it.

## Definition of Done
- [ ] ACs met; export validates against the template; golden-file test green
- [ ] Parent epic RTV-28 (#499) + RTV-18 (#320) updated

## Dependencies
- Parent: #499 (RTV-28); Depends on RTV-36, RTV-37
- Reshapes: #320 (RTV-18)
