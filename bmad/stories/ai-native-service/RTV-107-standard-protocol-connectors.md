---
id: RTV-107-standard-protocol-connectors
title: "Discovery connectors: standard protocols (SCIM / OData / generic REST)"
status: Ready
type: Story
epic: discovery
milestone: "RTV — AI-native TPRM service"
estimate: 8
labels: [retrieva, ai-native, backend, integration, productization]
priority: Could
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## Story

As a **customer whose systems speak a standard protocol**, I want Retrieva to connect via **SCIM /
OData / a configurable generic REST endpoint** rather than a vendor-specific connector, so that one
connector covers many systems (Entra ID, Okta, Google via SCIM; SAP/Dynamics via OData) without a
bespoke build each.

## Background

The Tier-2 middle of the connector strategy (`docs/connectors/discovery.md`), between the first-class
vendor connectors (RTV-91/92) and the generic AI-ingestion fallback (RTV-106). Many enterprise systems
expose a **standard**: most IdPs speak **SCIM**; SAP/Dynamics speak **OData**; many apps have a listable
**REST** collection. One connector per *protocol* (configured by the customer: base URL + auth + the
record path/JSONPath) replaces N per-vendor connectors for the systems that conform.

## Acceptance criteria

- A **generic REST** source configurable with base URL, auth (bearer/basic/token/API-key), the list
  path, and a **JSONPath** to the record array + field mapping → `DiscoveredApp[]`.
- A **SCIM** client (list `/Users` + `/Groups` / service-provider apps where exposed) normalised to the
  rails. An **OData** client (entity-set query) for ERP/finance sources.
- Each is config-driven (no code change to add a conforming system); credentials via the platform
  secret convention (ESO), never in code; egress via a scoped netpol.
- Reuses the existing async pipeline + provenance; where the protocol lacks a field, the LLM mapper
  (and RTV-106's inference) fills the gap.

## Definition of Done

- L0–L2 tests per protocol client (auth, pagination, normalisation) with injected `fetch`; a contract
  fixture for each protocol's response shape.
- `DiscoverySource` extended; enum migration + ERD regenerated (x86).
- Docs: the Tier-2 section of `docs/connectors/discovery.md` made concrete (config examples per protocol).

## Out of scope

Bespoke per-vendor connectors beyond the current set (added only for the 80/20 systems, need-first);
the generic upload path (→ RTV-106); a BYO-connector SDK for customers (future Tier-4).
