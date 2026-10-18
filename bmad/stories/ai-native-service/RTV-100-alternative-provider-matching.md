---
id: RTV-100-alternative-provider-matching
title: "Alternative-provider matching (substitutes for a CIF vendor)"
status: Ready
type: Story
epic: exit-strategy
milestone: "RTV — AI-native TPRM service"
estimate: 8
labels: [retrieva, cert, ai-native, backend, domain-logic]
priority: Could
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## Story

As an **ICT risk officer**, for a vendor supporting a Critical/Important Function, I want Retrieva to
**suggest substitutable providers (and open-source alternatives)**, so my exit strategy names real
fallbacks instead of "TBD".

## Background

First exit-strategy slice. Given a CIF arrangement (provider + the ICT service/function it supports),
match candidate alternatives from a **substitutes dataset** (a curated service→alternatives catalogue,
versioned like the control library) plus LLM reasoning over the service description, ranked by fit and
independence (ideally not sharing the same nth-party substrate — reuse concentration data).

## Acceptance criteria

- For a given CIF arrangement, the service returns ranked alternative providers with a rationale
  (capability fit, substitutability, and independence from the incumbent's nth-party chain).
- Candidates come from a maintained substitutes catalogue; LLM reasoning only *ranks/justifies* within
  that set (grounded, not invented), via the LiteLLM gateway, Langfuse-traced.
- Results attach to the arrangement's exit section as a reviewable draft.

## Definition of Done

- L0–L2 tests over the matcher with a seeded substitutes catalogue + arrangement fixtures.
- Docs: the substitutes-catalogue schema + how independence is scored (ties to concentration graph).

## Out of scope

The full exit blueprint (RTV-101); live market-data scraping (start with a curated catalogue).
