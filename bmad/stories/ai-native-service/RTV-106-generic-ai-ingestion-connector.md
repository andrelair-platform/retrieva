---
id: RTV-106-generic-ai-ingestion-connector
title: "Discovery connector: generic AI ingestion (upload/API dump → LLM-normalise)"
status: Ready
type: Story
epic: discovery
milestone: "RTV — AI-native TPRM service"
estimate: 8
labels: [retrieva, ai-native, backend, integration, productization]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## Story

As a **customer onboarding Retrieva with systems we don't have a built-in connector for**, I want to
**upload a CSV/Excel export (or paste an API response) of our vendors / AP ledger / SSO app list** and
have the agent **figure out the columns itself**, so that I get discovery proposals without waiting for
anyone to build a bespoke connector for my ERP/IdP.

## Background

The vendor connectors (Okta/Authentik/ERPNext — RTV-91/92) are the high-value *head* of a long tail:
every customer has different systems, so hand-building a connector per vendor doesn't scale. This story
adds the **AI-native catch-all**: a generic source that accepts arbitrary structured input and uses the
LLM to **normalise any schema** into the existing `DiscoveredApp` shape — then reuses the whole
pipeline (mapper → dedup → inbox → human confirm). This is the capability that distinguishes an
*AI-native* TPRM service from an integration platform that needs a parser per format. It is the Tier-3
fallback in `docs/connectors/discovery.md`.

## Acceptance criteria

- A `generic` discovery source accepts a **file upload (CSV/XLSX)** and/or a **pasted JSON array**.
- An **LLM schema-mapping step** infers which columns are the provider/vendor, the service, spend/criticality
  hints, etc., and emits `DiscoveredApp[]` — no hardcoded column names; confidence + the inferred mapping
  are recorded so a human can correct it.
- The normalised apps flow through the **existing** async pipeline unchanged (run → worker → proposal
  inbox → confirm); provenance records `source: generic` + the original row.
- A **dry-run / preview** shows the inferred column mapping + sample rows before a real run.
- Guardrails: a row cap + size cap; PII-light (don't send whole ledgers unnecessarily — map on a sample
  then apply); the mapping LLM call is Langfuse-traced through the LiteLLM gateway.

## Definition of Done

- L0–L2 tests: the schema-inference prompt covered by fixtures (messy real-world headers), the parse
  path (CSV/XLSX/JSON) unit-tested, and an integration that drives a sample file end-to-end to inbox.
- `DiscoverySource` extended with `generic`; the enum migration + ERD regenerated (x86).
- Docs: `docs/connectors/discovery.md` Tier-3 section made concrete (how to upload, the mapping review).

## Out of scope

Live API connectors that speak a standard protocol (SCIM/OData/generic REST) → **RTV-107**. Auto-learning
a reusable connector from a one-off upload (future).
