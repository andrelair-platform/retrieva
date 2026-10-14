---
id: RTV-79-a2a-contract
title: "A2A contract: Agent Card + assess-arrangement task schema (contract-first) + L3 contract test"
status: Ready
type: Story
epic: agentic-assessment
estimate: 3
labels: [retrieva, cert, backend, ai, api]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As the **supervisor** and the **crew** teams building in parallel, we want the **A2A contract defined
first** — the crew's **Agent Card** and the `assess-arrangement` **task schema** — so both sides code
against a pinned interface and an **L3 contract test** fails the build on drift.

## Context / constraints

- **A2A libs pinned (ADR-AGENT-02):** crew server = **`crewai[a2a]`** (bundles official **`a2a-sdk`**)
  via **`A2AServerConfig`**; supervisor client = **`@a2a-js/sdk`** v1.0 (`ClientFactory → Client`). Both
  A2A **Spec v1.0** → wire-interop; the Agent Card + task schema below are pinned against Spec v1.0.
- A2A **cluster-internal only** (no Ingress); source pinned to `retrieva-backend` by netpol + a
  short-lived service-token header. **Idempotency key = `runId + node`** (a retried delegation never double-writes).
- Contract-first: this story ships the **schema + a mock**, not the real crew (RTV-81) or the service (RTV-80).

## Acceptance

- [ ] **Agent Card** (`/.well-known/agent.json`) spec for the crew: skill `assess-arrangement`, version, I/O schema.
- [ ] **Task schema** committed (shared, versioned):
      - request: `{ runId, arrangementId, clauses[], evidenceRefs[], controlLibraryVersion, context }`
      - response: `{ findings[], verdicts[], citations[], confidence, insufficientEvidence[] }`
- [ ] Schema added to `retrieva-backend/openapi/` (or a shared `contracts/` dir) as the source of truth.
- [ ] **L3 contract test both directions**: backend request validates against the schema; a crew-side
      test validates its response against the same schema (per `testing.md` Tier-A — a mocked boundary
      must be backed by a contract test).
- [ ] Auth + idempotency documented on the endpoint (per `documentation.md` endpoint rule).
- [ ] A stub/mock A2A server returns schema-valid canned responses so RTV-78's assessment node can call it.

## Out of scope

Real CrewAI reasoning (RTV-81), the deployed Python service (RTV-80), the human gates (RTV-82).
