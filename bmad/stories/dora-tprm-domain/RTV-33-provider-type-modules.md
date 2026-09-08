---
id: RTV-33-provider-type-modules
title: "EPIC: Provider-type assessment modules (AI/ML first)"
status: Ready
type: Epic
epic: dora-tprm-domain
estimate: 8
labels: [epic, retrieva, cert, domain-logic, ai]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Epic

As a **due-diligence analyst**, I want provider-type-specific assessment modules (starting with AI/ML providers) so that the checklist is proportionate to the provider type, not one-size-fits-all.

## Why

A generic TPRM checklist misses AI-specific risk (prompt/output retention, training on customer data, EEA residency, tenant isolation, model-change notification, hallucination/prompt-injection, human oversight). An AI module is a genuine differentiator, is self-dogfooded (Retrieva is itself an AI arrangement on the platform), and strengthens the EU AI-Act story. Pluggable-module pattern → payment-processor / cloud-infra modules later.

## Scope / Acceptance (epic-level)

- [ ] **Pluggable provider-type module** pattern over the same engine (typed extension, not a fork).
- [ ] **AI/ML module** triggered on `service_type = AI/ML`: prompt/output retention, training-on-customer-data, retention-disable, EEA egress, tenant isolation, model versioning + change notification, human oversight, hallucination/prompt-injection/data-leakage controls, content filtering, eval methodology, model fallback, provider/model dependency.
- [ ] Module asks for **evidence**, not yes/no (question → supplier answer → evidence → validation).
- [ ] Module fields feed the arrangement graph + concentration analysis (e.g. model/provider dependency).

## Dependencies
- Depends on: RTV-28, RTV-30, RTV-31.
