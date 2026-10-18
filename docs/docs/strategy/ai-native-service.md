---
sidebar_position: 6
---

# Retrieva as an AI-native TPRM service

> **Thesis.** Stop selling a tool that a client's team logs into to fill spreadsheets. Sell a
> **managed digital workforce** — autonomous agents that continuously *discover, evaluate, monitor and
> report* on third-party ICT risk, backed by DORA domain experts who review, sign off, and defend the
> output in an audit. The client hands over raw data; the service does ~95% of the heavy lifting; a
> human owns the accountability. The product sold is an **outcome** (an audit-ready Register of
> Information, compliant contracts, live exit strategies) — not user licenses.

This page sets the direction and maps it honestly onto what Retrieva already is. It is a **cadrage /
faire-évoluer** artefact (RNCP39583 BC01 / BC04): where we are, where we're going, and the phased plan
to get there.

## Why this is an evolution, not a rewrite

Retrieva already has the hard parts of an AI-native service — an **agentic assessment orchestrator**
(a deterministic LangGraph supervisor delegating to a CrewAI crew over A2A, resumable + live-monitored),
a **human-in-the-loop governance spine** (decision inbox, approval center, separation-of-duties), a
**Register of Information domain** (arrangements, AI contract intake, control library, live RT.02.01
projection, EBA export), a **concentration / nth-party graph**, and a **governed AI platform** (every
LLM call through the LiteLLM gateway with PII masking + budgets, traced in Langfuse). See
[How an assessment flows](/#how-an-assessment-flows).

The gap to a *managed service* is therefore specific, not foundational: **autonomous discovery** into
enterprise source systems, **external continuous surveillance**, **exit-strategy automation**,
**contract redlining**, and the **commercial/operating model**. That is the subject of the roadmap below.

## How the two repos deliver it

One picture of the whole service: raw client data on the left → the autonomous agents that turn it into
DORA artefacts (the five pillars) → a **human-in-the-loop inbox of drafts** → the DORA analyst who signs
off → the outcomes. The trust boundary is the inbox — **agents propose, the analyst disposes**; nothing
is auto-applied.

[![How the Retrieva AI-native service works](/img/architecture/retrieva-ai-native.svg)](/img/architecture/retrieva-ai-native.svg)

The work is split across two repositories that collaborate over the **A2A** protocol:

- **`retrieva-backend`** — the deterministic **TypeScript supervisor** that owns the rails. Each pillar
  is an agent (discovery + completeness, the dynamic-DDQ/contradiction/follow-up loop, the Art-30
  contract redliner + notice/price alerts, the exit-strategy agents, CTPP surveillance incl. CVE/OSV)
  plus the **unified DORA score engine** (`0.6·gap + 0.4·ddq − risk penalty → GREEN/AMBER/RED`). Every
  agent writes **draft** artefacts into the HITL inbox; nothing is applied without analyst sign-off.
- **`retrieva-assessment-crew`** — the **CrewAI (Python)** multi-agent assessment crew. The supervisor
  delegates the deep gap analysis to it via JSON-RPC `message/send` (the `assess-arrangement` skill,
  byte-identical vendored schemas, gated by `CREW_A2A_ENABLED`), then maps the result back into the
  arrangement graph.

Both reason **only** through the governed AI platform — every call goes through the **LiteLLM** gateway
(routing, fallbacks, PII masking) and is traced in **Langfuse** (session-stitched across the A2A hop).
No model is ever called directly.

> Diagram-as-code: [`docs/diagrams/retrieva_ai_native.py`](https://github.com/andrelair-platform/retrieva/blob/main/docs/diagrams/retrieva_ai_native.py)
> — regenerate with `python retrieva_ai_native.py && python embed-svg-images.py`.

## The operating model: AI + human expertise

Three commitments distinguish the service from the tool:

1. **Zero data-entry burden.** The client hands over raw inputs (contracts, invoices, vendor lists, or
   just read-only access to source systems). Agents do the parsing, mapping, and drafting.
2. **Human-in-the-loop validation.** AI parses, maps, scores and drafts; **DORA analysts + legal experts
   review, sign off on risk ratings, and defend the register during audits.** This is already enforced
   in code (approval gates, separation-of-duties, immutable audit trail) — the service wraps staffing
   and SLAs around it.
3. **Outcome-based SLA.** We guarantee the *result* — an audit-ready RoI, DORA-compliant contracts,
   tested exit strategies — not a seat count. Pricing shifts from licenses to the guarantee.

## The five service pillars — current → target

Legend: **🟢 shipped** · **🟡 partial** · **🔴 net-new**.

### Pillar 1 — The Autonomous Register of Information engine

DORA's RoI must conform to the rigid EBA ITS **2024/2956** schema (linked templates: entity
identification, contracts, sub-outsourcing, functions). The service keeps it *continuously* correct.

| Capability | State | Notes |
|---|---|---|
| AI contract intake → proposed arrangement (human-confirmed) | 🟢 | `contractExtractionService` + intake |
| Bulk estate import (CSV/XLSX) | 🟢 | `estateImport` |
| Multi-table EBA schema population + live RT.01–RT.04 projection/export | 🟢 | `registerProjectionService`, `roiExportService` |
| Continuous gap/freshness checks on the register (missing fields, expired contracts, unmapped sub-chains) | 🟡 | lifecycle + periodic re-assessment exist; needs a dedicated register-completeness agent |
| **Continuous discovery agents** sweeping AP/ERP (SAP/NetSuite), procurement, SaaS/IdP (Okta/SaaS-mgmt), ITSM (Jira/ServiceNow), card feeds → auto-discover shadow IT | 🔴 | the headline net-new; intake is upload-driven today, not system-swept |

### Pillar 2 — Intelligent vendor due diligence & DDQs

| Capability | State | Notes |
|---|---|---|
| Autonomous parsing of SOC 2 / ISO 27001 / pentest / policies vs DORA baseline | 🟢 | gap-analysis engine + ingestion |
| Questionnaires with LLM scoring + vendor evidence portal (no vendor login) | 🟢 | questionnaires, evidence portal |
| Live DORA risk score + remediation tracker | 🟢 | deterministic scoring + risk register |
| **Dynamic/interactive DDQ** tailored by criticality | 🔴 | today's questionnaires are static/templated |
| **Answer-vs-evidence contradiction detection** ("paper compliance") | 🟡 | gap analysis cross-references docs; a dedicated discrepancy check is net-new |

### Pillar 3 — Deep contract lifecycle & clause tracking (Art 30)

| Capability | State | Notes |
|---|---|---|
| Contract intelligence extraction; missing-clause detection vs a DORA control library | 🟢 | intake + versioned control library |
| Renewal / notice-period / price-escalation lifecycle alerts | 🟡 | monitoring covers renewals; notice-period + escalation watchers are additive |
| **Automated redlining** — draft DORA-aligned amendments for legal review | 🔴 | net-new generation step |

### Pillar 4 — Dynamic exit strategy & transition planning (CIFs)

Mostly greenfield — the biggest net-new area. For Critical/Important Functions DORA requires viable exit
strategies + documented transition plans.

| Capability | State | Notes |
|---|---|---|
| CIF identification + criticality tiers | 🟢 | arrangements domain |
| **Alternative-provider matching** (substitutable vendors / OSS) | 🔴 | needs a market/substitutes dataset + matcher |
| **Exit-blueprint generation** (data-portability timelines, key handover, parallel-run steps) | 🔴 | new generator |
| **Reintegration modeling** (how fast in-house could take over) | 🔴 | new |

### Pillar 5 — Continuous CTPP & supply-chain surveillance

CTPPs (Microsoft/AWS/Google/major financial SaaS) are directly overseen by the ESAs (ESMA/EBA/EIOPA).

| Capability | State | Notes |
|---|---|---|
| Concentration / nth-party graph — single points of failure, over-concentration (Art 28(4)/29) | 🟢 | `concentrationService` + concentration dashboard |
| Sub-provider extraction (AI, human-confirmed) | 🟢 | concentration intake |
| **External 24/7 surveillance** — threat feeds, outage/breach/regulatory/geopolitical monitors on CTPPs | 🔴 | net-new ingestion of external signals, attached to the graph |

## The responsible-AI spine (why the service is *defensible*)

A managed service only works if a human can **sign off and defend** the output. That guarantee rests on
controls Retrieva already enforces, and which every net-new agent must inherit:

- **One governed LLM path** — all calls via the LiteLLM gateway (provider routing, key rotation, **PII
  masking**, budgets, EU governance); **Langfuse** traces every generation (cost + audit).
- **Deterministic supervisor, halt-on-doubt** — agents route deterministically and **stop at a human
  gate before anything authoritative**; no free-form autonomy on regulatory output.
- **Human-in-the-loop + separation-of-duties** — the decision inbox / approval center gate every finding
  and risk; the drafter cannot be the approver.
- **Immutable audit trail + reproducible scoring** — append-only evidence, and a deterministic risk
  formula an auditor can re-derive (no black-box LLM score).

**Design rule for every new pillar:** autonomous *discovery and drafting*, never autonomous *sign-off*.
Agents widen coverage; humans keep accountability.

## Phased roadmap

| Phase | Theme | Headline work |
|---|---|---|
| **Now — harden the spine** | make the existing agentic+HITL+RoI platform production-robust | register-completeness agent (P1 🟡), notice-period/escalation watchers (P3 🟡), discrepancy check (P2 🟡) |
| **v2 — autonomous intake & surveillance** | kill the data-entry burden; watch the outside world | **discovery connectors** (Okta/SaaS-spend → proposed arrangements; AP/ERP invoice ingest) (P1 🔴); **external CTPP surveillance** feeds attached to the concentration graph (P5 🔴) |
| **v3 — autonomous drafting & exit** | the expert-grade outputs | **contract redlining** (P3 🔴); **exit-blueprint generator + alternative-provider matching + reintegration modeling** (P4 🔴); **adaptive DDQ** (P2 🔴) |
| **Service wrap (parallel)** | turn software into a service | analyst-review operating model, **outcome-based SLA & pricing**, onboarding = "hand us read-only access", audit-defense playbook |

Each 🔴 ships as a thin vertical slice first (one connector / one feed / one blueprint) behind the same
HITL gates, then broadens — consistent with the platform's delivery-path sizing.

## Commercial model (the shift)

| Tool (today) | AI-native service (target) |
|---|---|
| Per-seat / per-workspace licenses | **Outcome-based SLA** — guarantee an audit-ready RoI + compliant contracts + live exit strategies |
| Client does the data entry | Client grants read-only access / hands over raw docs; agents do ~95% |
| Support | **Managed by DORA analysts + legal experts** who review AI output and defend it in audits |

## Certification mapping (RNCP39583)

- **BC01 — Cadrer** : this document (vision, gap, roadmap, make/evolve decision).
- **BC02 — Concevoir & développer** : each net-new pillar's design + build (discovery connectors,
  surveillance agents, exit-blueprint generator, redliner).
- **BC03 — Coordonner & piloter** : the managed-service operating model + SLA.
- **BC04 — Maintenir & faire évoluer** : the phased roadmap and the "discovery → drafting → sign-off"
  evolution of the agent fleet under unchanged governance.

> **One-line positioning.** *Retrieva is a managed digital workforce for DORA third-party ICT risk:
> autonomous agents discover, assess and monitor your vendors; DORA experts sign off; you get a
> guaranteed, audit-ready Register of Information — not another dashboard to fill in.*
