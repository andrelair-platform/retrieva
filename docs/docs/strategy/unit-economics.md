---
sidebar_position: 5
---

# Unit Economics & Cost Model

> **Purpose.** Turn "is the pricing realistic?" from a hand-wave into a defensible number.
> This is the **BC01 (Piloter — pilotage / budget)** artefact behind the pricing on
> [`/pricing`](../frontend/pricing.md) and the pricing strategy in
> [Product Maturity & Pricing](./product-maturity.md).
>
> Figures are **order-of-magnitude estimates** for a European B2B SaaS selling to regulated
> financial entities — not booked actuals. They exist to show the model is coherent and to name the
> real cost drivers, not to forecast a P&L to the euro.

## Two lenses — read the price against the right one

| Lens | What it is | Real cost today |
|---|---|---|
| **Portfolio / certification (actual)** | Retrieva as the RNCP39583 deliverable, running on the self-hosted minicloud | **≈ €0 marginal** — sunk-CAPEX hardware, AI via self-hosted models (electricity, not API bills), team of one |
| **Commercial SaaS (hypothetical)** | What it would cost to sell/operate this for real | The analysis below |

The pricing page is a **market-credible pricing model** (Lens 1). The numbers below stress-test it
against **Lens 2** — the business it *would* be.

## Cost-to-serve (per customer, marginal) — the price covers this

The variable cost of one active tenant:

| Driver | Estimate / customer / mo | Notes |
|---|---|---|
| Cloud infra (Postgres + app + vector store + workers) | €30–80 | drops with tenant density |
| AI — embeddings + RAG queries + assessment LLM calls | €20–100 (paid APIs) · ≈0 (self-hosted GPU) | the one driver that scales with *usage*, not just tenant count |
| **Total cost-to-serve** | **≈ €50–150** | |

Gross margin per plan against that cost-to-serve:

| Plan | Price / mo | Cost-to-serve (est.) | Gross margin |
|---|---|---|---|
| Starter | €199 | ~€60 | ~70 % |
| Professional | €499 | ~€90 | ~82 % |
| Business | €999 | ~€150 | ~85 % |
| Enterprise | Custom | negotiated | — |

**Verdict:** every plan is **margin-positive on cost-to-serve**, with healthy 70–85 % gross margins
typical of B2B SaaS. Pricing by the size of the third-party estate (vendors managed) aligns price
with the customer's own risk surface — the correct value metric for DORA TPRM.

## Fixed / overhead — the price does *not* cover this until volume

For a product sold **into regulated financial entities**, the fixed base is dominated by costs that
are non-optional to even make a sale:

| Bucket | Est. / yr | Why it's unavoidable |
|---|---|---|
| **Compliance** — SOC 2 Type II, ISO 27001, annual pen-tests, DPO, cyber-insurance, legal | €100–200k | banks/insurers will not buy DORA tooling from an un-certified vendor |
| **Team** — 2–3 engineers + support/CSM + sales (loaded) | €300–500k | build, operate, sell, support |
| **Sales & marketing / CAC** | €5–20k per logo | long B2B-fintech cycles |
| **Fixed base** | **≈ €0.5–1.0M / yr** | |

## Break-even

Using a **blended ARPU ≈ €500/mo** and a blended cost-to-serve ≈ €100/mo → **contribution ≈ €400/mo
(~€4.8k/yr) per customer**:

```
break-even customers = fixed base / contribution-per-customer
                     = €0.5–1.0M / €4.8k
                     ≈ 100–210 paying customers
```

That is a **normal** SaaS shape: the per-unit price covers marginal cost and *contributes* to the
fixed base; the gap to ~100–200 customers is bridged by the revenue ramp (or a raise). **No
early-stage SaaS sticker price single-handedly funds a compliance-certified fintech operation** — and
this model doesn't pretend to. The honest claim is: *unit-profitable from customer #1, structurally
profitable at ~100–200 customers.*

## The one product-cost guard: AI at scale

The only cost-to-serve line that can run away is **AI on paid providers under heavy use**. The
posture (decision recorded in issue **#628**):

1. **Keep AI "included / fair-use"** — no per-plan query metering. A flat abuse limiter
   (`middleware/ragRateLimiter.ts`, 100 req/hr authenticated) already bounds the worst case.
2. **Instrument AI cost per organisation** via the LiteLLM gateway spend metrics.
3. **Revisit metering only if** a single org's monthly AI cost exceeds a defined share of its plan
   price. Until then, self-hosted models keep the marginal cost near zero.

This keeps the pricing promise ("every capability on every plan") honest **and** protects the margin
— need-first, not premature metering.

## What this is evidence of (BC01)

- The pricing is **grounded in a cost model**, not guessed — a *pilotage / budget* artefact.
- The dominant cost of a regulated-fintech SaaS is **compliance + team**, not infrastructure — which
  is *why* Retrieva is built on a compliance-first platform (Vault, PKI, audit trails, DORA controls)
  from day one: it de-risks the most expensive fixed cost.
- The model names its **own** assumptions and guards (the AI-cost trigger), which is the point of
  pilotage: decisions made with the numbers visible.
