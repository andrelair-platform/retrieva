---
id: RTV-95-ctpp-signal-ingestion
title: "External CTPP signal ingestion (status / breach / CVE feeds)"
status: Ready
type: Story
epic: surveillance
milestone: "RTV — AI-native TPRM service"
estimate: 8
labels: [retrieva, cert, ai-native, backend, integration]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## Story

As an **ICT risk officer**, I want Retrieva to **continuously ingest external signals about our critical
providers** (status-page incidents, breach/CVE disclosures, regulatory actions), so that I hear about a
CTPP problem from Retrieva, not from the news.

## Background

The ingestion half of Pillar 5. A scheduled collector pulls from external sources (provider status pages,
a CVE/breach feed, a news/regulatory source), normalises each into a **surveillance event**
(`{provider, type, severity, summary, url, observedAt}`), and classifies/scopes it to a tracked provider.
Pairs with RTV-96 (which attaches events to the concentration graph + alerts).

## Acceptance criteria

- A `surveillance/` collector ingests ≥1 real external source on a schedule and stores normalised events.
- Events are **matched to tracked providers** (the CTPPs/providers in the register/graph); unmatched
  events are dropped or parked, not noise.
- Severity/relevance classification runs via the LiteLLM gateway; Langfuse-traced; deterministic fields
  (source, timestamp) are parsed, not LLM-guessed.
- Idempotent (re-ingesting the same incident doesn't duplicate); rate-limited / respectful of sources.

## Definition of Done

- L0–L2 tests with recorded feed fixtures; the classification boundary has a contract/fixture test.
- Egress netpol restricts the collector to the declared sources.
- Docs: the source list + the event schema.

## Out of scope

Graph attachment + alerting (RTV-96); paid threat-intel integrations (start with free/public sources).
