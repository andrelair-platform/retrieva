---
id: RTV-93-register-completeness-agent
title: "Register-completeness agent (missing fields / expired contracts / unmapped sub-chains)"
status: Ready
type: Story
epic: discovery
milestone: "RTV — AI-native TPRM service"
estimate: 5
labels: [retrieva, cert, ai-native, backend, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## Story

As a **compliance analyst**, I want an agent that **continuously checks the Register of Information for
gaps** — missing EBA fields, expired contracts, unmapped sub-outsourcing chains — and flags them to me
**before a regulator spots them**, so the register stays audit-ready between assessments.

## Background

A "now / harden the spine" item: the arrangements domain, RT.01–RT.04 projection, lifecycle and periodic
re-assessment already exist (`services/registerProjectionService`, `lifecycle/*`). This story adds a
dedicated **completeness pass** over the live register that scores each arrangement for EBA-schema
coverage and freshness, and raises findings into the existing decision inbox / monitoring.

## Acceptance criteria

- A scheduled job evaluates every arrangement for: required EBA fields present, contract not expired /
  within notice window, sub-outsourcing chain mapped where the function is critical/important.
- Each gap → a finding in the decision inbox (or a monitoring alert) with the specific missing field /
  stale date and a suggested fix; deduped across runs.
- A per-workspace **register-readiness score** (e.g. % complete) is exposed via the register API.
- Any LLM-assisted suggestion runs via the LiteLLM gateway and is Langfuse-traced; deterministic checks
  (field present / date expired) are plain code, not LLM.

## Definition of Done

- L0–L2 tests over the completeness rules with fixtures for complete / incomplete / expired arrangements.
- No state mutation beyond raising findings (read-mostly agent).
- Docs: the completeness rubric + the readiness-score formula.

## Out of scope

Auto-remediation (the agent flags; humans/other stories fix).
