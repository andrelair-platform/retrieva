---
id: RTV-39-control-library-model
title: "Control Library data model + DORA seed (article→control→evidence→CIF)"
status: Ready
type: Story
epic: dora-tprm-domain
milestone: "RTV — DORA ICT-TPRM domain model"
estimate: 5
labels: [retrieva, cert, backend, domain-logic]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **compliance engineer**, I want the DORA controls as versioned, structured data so that assessments are reproducible and inspectable rather than baked into a prompt.

## Background

Parent epic **RTV-29** (#500). ADR §4: the control library is the IP. Structured + versioned + (later) eval-gated.

## Acceptance Criteria

- [ ] AC-1: `Control` model: `id, dora_article_ref, domain, description, expected_evidence_types[], clause_match_patterns[], applicability_rule (CIF-keyed)`.
- [ ] AC-2: Covers the DORA control domains: governance, security, incident mgmt, business continuity, audit rights, data location, subcontracting, termination, exit strategy.
- [ ] AC-3: Library is **versioned** (`library_version`), immutable per version; a `version` string every assessment can stamp.
- [ ] AC-4: **CIF-driven applicability** — controls flagged mandatory/enhanced when the arrangement supports a critical/important function.
- [ ] AC-5: Seed the first library version from DORA Art. 28/30 requirements; loadable via a seed script; vitest on applicability resolution.

## Technical Notes

- Data, not prompts. Store as versioned documents/collection; expose a resolver "controls applicable to arrangement X".
- Keep DORA article references precise (for the audit citation in RTV-41).

## Definition of Done
- [ ] ACs met; seed loads; vitest green; a version stamp is queryable
- [ ] Parent epic RTV-29 (#500) updated

## Dependencies
- Parent: #500 (RTV-29); Depends on RTV-36 (CIF on arrangement)
- Blocks: RTV-40, RTV-41
