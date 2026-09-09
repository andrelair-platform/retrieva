---
sidebar_position: 4
---

# Defensibility & Moat

**Status:** Living · **Date:** 2026-09-09 · **Scope:** why Retrieva is not an AI wrapper and not a
3–5-year product. Companions: [Product Maturity](./product-maturity.md),
[DORA ICT-TPRM Domain Model](../architecture/dora-tprm-domain-model.md),
[Datastore](../architecture/datastore-postgresql.md), [Authorization](../architecture/authorization-model.md).

## The two questions this answers

1. Is Retrieva an **AI wrapper**?
2. Will it **die in 3–5 years**?

Short version: the *direction* is sound on both — the architecture is deliberately designed not to
be a wrapper, and the domain (mandatory, compounding regulation + system-of-record) is inherently
long-lived. The honest caveats are execution and incumbents, addressed below.

## Not an AI wrapper

**The wrapper test:** *if the LLM vendor shipped your feature tomorrow, are you dead?* For Retrieva,
no — the defensible asset isn't the model, it's four things the AI merely *operates on*:

1. **The graph is the moat, not the model.** The core asset is the accumulated
   `arrangement → provider → subcontractor → function → evidence → control` graph of a specific
   customer's estate — proprietary, relational, compounding. A frontier model doesn't have it and
   can't generate it. The recursive-CTE concentration / nth-party traversal (RTV-50/28/32) is
   *computation over that graph*, not a prompt; spreadsheets and generic chatbots structurally can't
   do it. (This is why the Postgres+Drizzle decision mattered.)
2. **The control library is curated IP.** Versioned `DORA article → control → expected evidence →
   clause patterns`, regression-tested (RTV-29/39/40). Domain knowledge encoded as inspectable,
   versioned data — the opposite of a prompt.
3. **The system of record + audit trail.** The Register (RT.02.01), immutable audit log, Separation
   of Duties, human-approved findings (RTV-37/43/55). This makes Retrieva the *source of truth* a
   regulated entity runs governance on. Systems of record have switching costs measured in years;
   wrappers, in minutes.
4. **The guardrails are anti-wrapper by design.** "Insufficient evidence" default, evidence-grounded
   citations, coverage-not-%, maker≠checker. A wrapper *trusts* the model; Retrieva structurally
   *subordinates* it to a human-governed process.

The AI is a **feature** (extraction, drafting, impact analysis), not the product. Swap the LLM
provider and Retrieva still works — that is the litmus test, and it passes.

**Where wrapper-risk still lives (honest):** today none of 1–4 is *built* — they're backlog
(RTV-28→56). What's live now (RAG chat + ingestion) is closer to a wrapper. So the direction is
right but **the moat is currently a plan, not code.** The risk is execution: actually build the
graph + control library + system-of-record, or you'll have a well-architected wrapper. This is why
the **MVP cut line** ([Product Maturity](./product-maturity.md)) is the discipline that matters most.

## Not a 3–5-year product

**Structural longevity:**
- **The problem is legally mandatory and permanent.** DORA is in force and regulator-enforced, with
  no sunset. Compliance demand doesn't churn like consumer trends — it deepens.
- **Regulation compounds in your favour.** DORA RTS updates, the CTPP/lead-overseer regime, and
  adjacent regimes (NIS2, EU AI Act, operational-resilience rules) each become a new module on the
  *same graph* — a widening moat, not a rebuild.
- **System-of-record stickiness.** Once a customer's estate lives in the graph and their Register is
  generated from it, ripping it out is a governance project nobody wants.

**The two genuine death risks (named, not hidden):**

1. **Incumbent absorption.** GRC suites (OneTrust, ServiceNow, Archer, MetricStream) and the Big-4
   will ship DORA modules. This — not AI — is the real competitive threat. Defense: **depth + focus**
   — the concentration graph, nth-party traversal, and change-impact engine done *specifically well*
   for ICT-TPRM, faster and cheaper than a horizontal suite's bolt-on. The danger is being shallow
   enough that "good enough" beats you. (A focused system-of-record with a data moat is also an
   acquisition target — a fine outcome.)
2. **Regulatory-tool commoditization.** If the ESAs ship a free reference tool, or DORA reporting
   becomes a checkbox in every cloud console, the low end erodes. Defense: be the *operational*
   platform (continuous monitoring, change-impact, remediation workflow, group governance) — the
   year-round risk-management system, not the one-time filing tool. The filing is a byproduct.

**What would actually kill it:** staying a single-entity assessment tool. Survival past year 3 is the
**V2 layer already scoped** — group governance (RTV-35), multi-regulation modules, the
change-monitoring engine as the always-on product. Hence the shape: *MVP now, platform layer as the
roadmap.*

## Strategy in one line

**Win on ICT-TPRM depth (the graph + nth-party + change engine), not on breadth.** Do not become a
horizontal GRC suite. Be the deepest, most operational system-of-record for DORA third-party risk,
built so the AI is subordinate to a human-governed, auditable process.

## Why this is the right RNCP / investor story

- **RNCP (BC02/BC04):** a justified architecture whose moat is the graph + curated control library +
  system-of-record — not a prompt — is exactly the engineering depth a jury probes for.
- **Investor/YC:** mandatory + compounding regulation, a data moat that strengthens with use, and
  switching costs of a system-of-record — with a clear-eyed view of incumbents and commoditization.
