---
sidebar_position: 10
---

# DORA ICT-TPRM Domain Model (ADR)

**Status:** Accepted · **Date:** 2026-09-08 · **Scope:** the canonical domain model of Retrieva
**Supersedes framing of:** RTV-15 (concentration graph) and RTV-18 (Register) as standalone features
**Referenced by epics:** RTV-28…RTV-35

> This is the reference document the Retrieva backlog and the RNCP defence both point at. It defines
> *what Retrieva is* as a product: one arrangement graph, one control-library-driven engine, three
> triggers, human-approved findings, a group-ready schema.

## Context

Retrieva is a **DORA ICT Third-Party Risk Management** platform. The naive shape — "upload a
contract, GPT tells you if you're DORA-compliant" — is neither defensible in an audit nor faithful
to the regulation. DORA imposes obligations on the **financial entity** and regulates its
**contractual arrangements** with ICT providers across a lifecycle (due diligence, monitoring,
change, exit), with a mandatory **Register of Information** (RT.02.01) and explicit
**concentration** (Art. 29) and **subcontracting** (Art. 30) concerns. A questionnaire generator
models none of this.

This ADR captures the model derived from first principles against the regulation.

## Decision (one line)

**One arrangement graph (= the DORA Register) + one control-library-driven engine, entered by three
triggers (existing / new / change), every verdict evidence-grounded and human-approved, on a
group-ready schema.**

## 1. The core object is the ICT *Arrangement*, not the Provider

DORA regulates the **contractual arrangement supporting a function**, not the vendor.
"France / Azure / Claims" and "Belgium / Azure / email" are **different arrangements** — different
criticality, data, exit difficulty, risk — even though Microsoft is the same provider. So the schema
is a **star**: the *Arrangement* is the fact; *Provider*, *Legal Entity*, *Business Function* and
*Data-class* are dimensions.

```
GROUP
  └── LEGAL ENTITY
        ├── BUSINESS FUNCTION ──(critical / important?)
        └── ICT ARRANGEMENT            ← the core object
              ├── ICT Service
              ├── Provider ── Subcontractor (nth-party)
              ├── Contract
              ├── Data (classes, residency)
              ├── Assessment → Findings → Risks → Remediations
              ├── Evidence
              └── Changes
```

## 2. The graph **is** the Register

RT.02.01 is ~15 *linked* tables (entity → arrangement → function → provider → subcontracting chain →
assessment…). That is a relational graph. Therefore the Register is **not a document you fill in** —
it is a **projection/export generated from the graph**. Single source of truth; no double entry.
This is also the demo line: *"you don't fill a spreadsheet; the Register falls out of the graph."*

## 3. Two-tier evidence (what makes group scale sane)

- **Provider-global evidence** (ISO 27001, SOC 2, security docs, BCP, subprocessor list, corporate
  info) attaches to the **Provider** and is **shared/inherited** across arrangements and entities —
  assess Microsoft's certifications *once*.
- **Arrangement-local evidence** (the specific contract, usage, data involved, criticality, exit
  plan, risk acceptance, local controls) stays **entity/arrangement-scoped**.

Every evidence record carries `document · version · source · date · provider · service · validity ·
hash`, and feeds an **immutable audit trail** (who decided, on what evidence, when).

## 4. One engine, driven by a versioned Control Library

The **Control Library** — *DORA article → control → expected evidence → clause-match patterns → CIF
applicability* — is the real IP (it is what makes Retrieva "not a GPT wrapper"). It is:
- **structured data**, inspectable ("how did you decide audit rights are met?");
- **versioned** — every assessment is stamped "assessed vs control-library v1.3 on `<date>`" for
  reproducibility;
- **regression-tested** with a labelled eval set (reusing the phi3-financial / RAG-eval discipline),
  so a model/prompt change cannot silently degrade control mapping.

The **assessment engine** (built on the shipped RAG + multimodal-ingestion + LLMOps stack) maps
extracted clauses to controls and produces findings.

## 5. Non-negotiable trust guardrails

These are what make the output audit-defensible and satisfy **both** DORA (management-body
accountability) and the **EU AI Act** (decision support + human oversight) simultaneously:

| Rule | Why |
|---|---|
| Verdict enum: Compliant / Partial / Non-compliant / **Insufficient-evidence** / N-A | absence of a document ≠ non-compliant |
| **Absence → "insufficient evidence, human review"**, never auto non-compliant | a false finding is worse than none |
| Every verdict **cites the exact clause/evidence** + what was searched | auditability, not a bare score |
| Report **"coverage", never "% compliant"** | a 91% automated score must not imply legal compliance |
| **Confidence grounded in evidence coverage**, not raw LLM self-report | LLM confidence is uncalibrated |
| **AI analyses/drafts; the human decides the risk** | DORA puts ICT-TPR on the management body |

## 6. Three triggers into one lifecycle (not three apps)

```
Prospect → Due diligence → Active (in Register) → Under review → Remediation → Exit
                ▲                    ▲                  ▲
          🟢 new request       🟡 existing estate   🔴 change / incident / periodic
```

| Trigger | Question | Output |
|---|---|---|
| 🟡 **Existing provider** | "Are our current arrangements compatible with our DORA framework?" | Gap + remediation plan |
| 🟢 **New provider** | "Can we onboard this provider, on what conditions?" | Due diligence + approval |
| 🔴 **Change monitoring** | "Does this provider change affect our DORA risk?" | Impact analysis + reassessment |

Plus **exit/termination** (Art. 28(8)) and **periodic re-assessment** (time-based, for CIF
arrangements even with no change) and **incident-linked** review. The "modes" are UI journeys over
one state machine — the Register must always reflect current state, and an auditor asks for an
arrangement's full history.

## 7. The change engine is a graph traversal (highest long-term value)

A change is analysed **once**; its business impact is evaluated **per affected arrangement** by
walking the graph. **Materiality = f(change type, reachability to a critical/important function,
data classes crossed)** — the same subprocessor change is 🔴 if it reaches *Claims Copilot* (critical
function, claims data) and 🟢 if it touches a dev sandbox. This is precisely what a spreadsheet
cannot compute.

To stay cheap and trustworthy, the LLM sees only what matters — the **noise funnel**:

```
source ingest → hash/version detect → structural diff → relevant-section filter → semantic LLM
```

A CSS change on a trust-centre page never reaches the model. Trigger sourcing is **honestly
semi-automated** in v1 (scheduled subprocessor-list ingest + a contractual-email inbox as the
reliable signal; scraping best-effort) — no "magic detection" is promised.

## 8. Group-ready schema now; group *features* deferred

DORA has a real group dimension: consolidated Register at group level, **intra-group arrangements**
(RT.02.01 **B_03**), concentration (Art. 29), the lead-overseer / CTPP regime. The full group
platform is OneTrust/ServiceNow-scale.

**Decision:** bake the group **schema** in from day one — it is brutal to retrofit and cheap while
single-entity — but **defer the group features**:
- **Now (schema):** `entity_id` on every arrangement; provider-global vs arrangement-local evidence
  split; intra-group arrangement type representable; Group → Entity → Function → Arrangement
  hierarchy — even though v1 runs a single entity.
- **Deferred (features, RTV-35):** framework inheritance, hierarchical ABAC + delegation/escalation,
  group consolidation dashboards, group concentration / fourth-party roll-up across entities.

*Justification:* a single entity taken **fully end-to-end** is stronger RNCP evidence and a cleaner
demo than a half-built group console — while the schema preserves the enterprise roadmap.

## 9. Reuse: this is not greenfield

| Layer | Built on (shipped) |
|---|---|
| Document AI / clause extraction | multimodal ingestion (RTV-14) |
| Retrieval + reasoning | RAG pipeline (RTV-05) |
| Traceability, cost gating, prompt mgmt | per-product LLMOps (Langfuse + LiteLLM/Qdrant governance) |
| Runtime (SSO, secrets, GitOps/Kargo, observability, autoscaling, canary) | RTV-03…12 |

The domain engine points the existing stack at the control library and the graph.

## 10. DORA article mapping

| Concern | DORA reference | Where in the model |
|---|---|---|
| Pre-contract due diligence (proportionate) | Art. 28(4) | 🟢 trigger |
| Ongoing monitoring | Art. 28(7) | 🔴 + periodic |
| Register of Information | Art. 28(3), RT.02.01 | §2 (graph projection) |
| Concentration risk | Art. 29 | graph analytics (§1, §7) |
| Subcontracting / change / right to object | Art. 30(2)(a) | 🔴 change engine |
| Exit strategy | Art. 28(8) | exit trigger |
| Intra-group arrangements | RT.02.01 B_03 | §8 (schema) |
| Management-body accountability | Art. 5, 28(1) | §5 (human decides) |

## Epic map (the backlog realisation)

| Epic | What it delivers |
|---|---|
| **RTV-28** | Arrangement-centric graph + Register projection + group-ready schema (reshapes RTV-15/18) |
| **RTV-29** | Versioned, regression-eval'd Control Library + clause→control mapping |
| **RTV-30** | Evidence-grounded, human-approved assessment engine (§5 guardrails) |
| **RTV-31** | Lifecycle state machine + three triggers + exit/periodic |
| **RTV-32** | Change & impact engine (noise funnel → semantic → graph-materiality) |
| **RTV-33** | Provider-type modules (AI/ML first) |
| **RTV-34** | AI-assisted graph intake (contract-parse → propose → confirm) |
| **RTV-35** | Group governance — **deferred**, schema-ready only |

## Consequences

- The backlog reorganises around the **engine + state machine** as the backbone; RTV-15/16/17/18
  become capabilities that hang off it.
- Every assessment is reproducible (control-library version) and auditable (evidence citations +
  audit trail) — the defensibility story for the RNCP defence and for a real risk officer.
- The graph's **freshness** (RTV-34 intake) is the true operational risk; AI-assisted population is
  treated as a first-class concern, not an afterthought.

## Delivered — RTV-36: arrangement star schema (group-ready)

The §1 star is now a live Drizzle/Postgres schema (`retrieva-backend/db/schema/`), additive migration
`0002_amused_northstar.sql`. The **fact** is `arrangements` (`organization_id` isolation scope + AC-2
`entity_id`, FKs to the four dimensions, plus `arrangement_type`, `data_classes`, `data_residency`,
`criticality`, `dependency`, `exit_difficulty`); the **dimensions** are `legal_entities`,
`business_functions` (`critical_or_important`), `ict_services`, and the **reused** `provider_nodes`.
Graph-traversal indexes cover provider→arrangements and function→arrangements (AC-6).

Two decisions taken here (context for RTV-37/38):

- **Provider = the existing `provider_nodes`** (RTV-48), not a new table. The concentration graph
  already models the deduped, org-scoped provider identity and its nth-party subcontractor edges
  (`provider_dependencies`) — so AC-3 (Provider→Subcontractor) is satisfied by reuse, and §3's
  "assess Microsoft once, shared across arrangements" is one identity space, not two. `provider_nodes`
  gained provider-global `lei` + `provider_type` columns.
- **`legal_entities` is a first-class dimension**, while `organization_id` remains the RTV-54
  isolation scope. An arrangement therefore carries **both** `organization_id` (tenant/isolation) and
  `legal_entity_id` (the DORA financial entity). This is what makes the schema group-ready per §8:
  `legal_entities.parent_entity_id` (self-ref) + `is_group_entity` (an intra-group arrangement names a
  group company as provider, AC-5) exist now; group *features* stay deferred to RTV-35.

Isolation is inherited, not re-implemented: every arrangement-graph query composes
`entityScopeCondition(…organizationId…)`, so the new tables are entity-isolated the moment
`ENTITY_ISOLATION_MODE=enforce` (already prod) — verified by `arrangementGraph.integration.test.js`.
The legacy `critical_functions` table (concentration graph) is left intact; convergence with
`business_functions` is deferred to RTV-37+.

## Delivered — RTV-38: the Register is a projection from the graph

§2 is now live: the DORA **Register of Information (RT.02.01)** is generated **on demand from the
arrangement graph**, never a hand-maintained spreadsheet. Backend `services/registerProjection.js`
(pure `assembleRegister`) + `registerProjectionService.js` (`buildRegister(orgId)`, reads the live
graph) + `registerExportService.js` (XLSX/CSV) + `GET /api/v1/register[/export]`.

- **The graph IS the Register.** B_01 (entity) ← `legal_entities`; B_02 (arrangements, the fact) ←
  `arrangements` joined to its dimensions; B_03 (intra-group) = the `arrangement_type='intra_group'`
  subset; B_05 (provider) ← `provider_nodes`; subcontracting ← `provider_dependencies`. No stored
  copy → it can never drift from live state.
- **Versioned field map** (`config/register/rt0201FieldMap.js`, `REGISTER_TEMPLATE_VERSION`): the EBA
  template columns live in one place, so an ITS template update is a config change, not code.
- **Missing required field → a gap, not a blank** (§5 spirit): fields the graph can't yet satisfy —
  provider country/LEI, and the latest assessment status (RTV-30/40) — surface in a **Gaps** list/sheet
  instead of a silent empty cell. This is also how RTV-37 (evidence/audit) fields are carried until
  that ships, so RTV-38 did not block on it.
- **Isolation inherited** — the register reads only through the RTV-36 repos, so it's entity-scoped
  under `ENTITY_ISOLATION_MODE=enforce` with no extra code.

Reshapes the placeholder RTV-18 workspace export (`roiExportService`), kept working until arrangement
intake populates the graph.
