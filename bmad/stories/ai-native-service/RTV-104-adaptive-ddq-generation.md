---
id: RTV-104-adaptive-ddq-generation
title: "Adaptive DDQ generation by criticality"
status: Ready
type: Story
epic: adaptive-ddq
milestone: "RTV — AI-native TPRM service"
estimate: 5
labels: [retrieva, cert, ai-native, backend, domain-logic]
priority: Could
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## Story

As a **third-party risk analyst**, I want the due-diligence questionnaire to **adapt to the vendor's
criticality and service type**, so a critical cloud provider gets the deep set and a low-risk tool gets a
light one — instead of one static questionnaire for everyone.

## Background

Builds on the existing questionnaire module (`services/QuestionnaireService`, `questionnaireScorer`) and
the vendor evidence portal. Given the arrangement's criticality tier + ICT service type, select/generate a
tailored question set from a maintained question bank (grounded), rather than a fixed template.

## Acceptance criteria

- Questionnaire generation takes criticality tier + service type and produces a tailored question set
  (more/deeper questions for critical/important functions; lighter for standard).
- Questions are drawn from / grounded in a maintained bank (auditable), with LLM tailoring via the LiteLLM
  gateway, Langfuse-traced — not free-invented questions.
- Backwards compatible with the existing tokenised vendor-link flow (no vendor login) and scoring.

## Definition of Done

- L0–L2 tests: tier → expected question-set shape; generation boundary has a contract test.
- Docs: the question bank + tailoring rules.

## Out of scope

Contradiction detection (RTV-105); fully free-form interactive chat DDQ (future).
