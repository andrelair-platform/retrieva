---
sidebar_position: 3
---

# Product Maturity, MVP Cut Line & Pricing

**Status:** Living · **Date:** 2026-09-08 · **Scope:** where Retrieva is on the product lifecycle,
what the MVP is, and how it's priced. Companion: [DORA ICT-TPRM Domain Model](../architecture/dora-tprm-domain-model.md).

## Product type

**B2B SaaS — regulated compliance — open-core with a self-host enterprise tier.** Retrieva sells to
regulated EU financial entities (banks, insurers) solving a **legally mandatory** problem (DORA, in
force Jan 2025). This is **high-ACV / low-volume / long-cycle** B2B with security & procurement
gatekeepers — not B2C volume, not a marketplace. The self-host option (RTV-44) makes it specifically
*deploy-anywhere open-core* B2B, which suits a buyer that often refuses multi-tenant SaaS.

## Where we are (honest assessment)

| Lifecycle stage | Retrieva status |
|---|---|
| 1. Idea / Discovery | **Done** — problem is *regulator-validated* (ESA 2024 dry run: 6.5% passed all Register checks; DORA mandatory). Strongest asset. |
| 2. PoC | **Substantially done** — RAG + multimodal ingestion + LLMOps prove "AI over compliance documents" is feasible. |
| 3. Prototype | **Partial** — landing/brand + working chat UI exist; the DORA *workflows* (triggers, Register, concentration graph) aren't prototyped as UX yet. |
| 4. **MVP** | **Not reached** — the assess-an-arrangement engine is RTV-28→50, all still Todo. |

**The mismatch to correct:** infrastructure is at ~stage-8 maturity (prod-grade GitOps/Kargo/
observability, live on `retrieva.online`), but the **product core is pre-MVP**. Classic
strong-engineer trap — over-invested in platform, under-invested in the domain. The RTV backlog is
the road to MVP and is correctly sequenced; the fix is to build the domain core next.

## The maturity ladder mapped to the backlog

| Stage | Scope | RTV stories |
|---|---|---|
| **MVP** — *"will a compliance officer assess an arrangement and trust the output?"* | Postgres+Drizzle foundation → arrangement graph + evidence + Register → control library → assessment engine (cited, human-approved). **One trigger only (🟡 existing provider).** | RTV-45→48, 36, 37, 38, 29/39, 30, 41, 42, 43 |
| **MLP** — delight/retention | WHOOP redesign (done) + the **concentration graph** as the "wow" | RTV-50 → RTV-28, partial RTV-34 |
| **V1.0 GA** | Full lifecycle (🟢 new + 🔴 change), AI-provider module, billing/support/docs | RTV-31, 32, 33 |
| **V2.0 / Enterprise** | Group governance (multi-entity), self-host | RTV-35, RTV-44 |

**The MVP cut line is the decision that matters most now.** Everything below the MVP row is the
smallest build that validates demand — resist pulling V1/V2 features (change engine, group,
self-host) into it. MVP-scope issues carry the **`mvp`** label on board #2.

### What the MVP deliberately excludes (and why)
- **🟢 new-provider + 🔴 change triggers** (RTV-31/32) — MVP proves the engine on the *existing*
  estate (🟡) first; the other triggers reuse the same engine and come at V1.0.
- **AI-provider module** (RTV-33) — a differentiator, not needed to validate the core loop.
- **Graph-intake automation** (RTV-34) — MVP can seed the graph manually; automate once the loop is proven.
- **Group governance / self-host** (RTV-35/44) — enterprise expansion (V2), schema-ready but deferred.

## Pricing / deal size

High-ACV **per-legal-entity annual subscription**, tiered by # arrangements, # entities,
critical-function coverage, and self-host — not freemium/volume:

| Tier | Target |
|---|---|
| Paid pilot (PoV) | €5k–€15k for a 1–3 month proof against their real vendors |
| Mid-market | ~€12k–€30k / entity / year |
| Enterprise / group (multi-entity + self-host) | €60k–€150k+ / year |

**Near-term target is not MRR — it's the PoV row: 1–3 pilot accounts.** As a solo project, aim at
**MVP + 5–20 design partners / 1–3 paid pilots**, not user counts. Benchmarks (B2B SaaS): MVP =
5–20 design partners, $500–$5k MRR; PoV = 1–3 pilot enterprise accounts, $0–$5k paid pilots.

## RNCP reality check

Retrieva is a **certification project first**. For the diploma (BC02 concevoir/développer, BC04
optimiser), the stage that scores is **a demonstrable MVP + defensible architecture + evidence** —
not MRR. Ship a working, defensible MVP of the assessment engine; that outweighs any revenue number
for the defense. The YC/commercial angle is real but secondary to shipping the MVP.
