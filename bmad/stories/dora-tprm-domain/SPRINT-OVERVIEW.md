# Retrieva — DORA ICT-TPRM domain model (epics)

**Product / board:** Retrieva — RNCP39583 Certification (Project #2)
**Initiative:** Certification
**Home repo:** `retrieva`
**Type:** Epic backlog (net-new, from the 4-turn domain-model design; each epic spawns RTV stories later)

---

## The model (one line)

**One arrangement graph (= the DORA Register) + one control-library-driven engine, entered by three
triggers (existing / new / change), every verdict evidence-grounded and human-approved, on a
group-ready schema.** These 8 epics turn the *planned* DORA-domain stories (RTV-15…18) from named
placeholders into a coherent ICT-Third-Party-Risk-Management platform.

## Why these (justification, short)

- Retrieva already ships the **AI substrate** (RAG RTV-05, multimodal ingestion RTV-14, LLMOps,
  LiteLLM/Qdrant governance) and enterprise **runtime** (RTV-03…12). The domain engine is *not*
  greenfield — it points the existing stack at a control library + the graph.
- DORA regulates the **arrangement supporting a function**, not the vendor → the graph is
  arrangement-centric and *is* the Register (RT.02.01 is relational). Group hierarchy is baked into
  the **schema** now (cheap) but its **features** are deferred (RTV-35) to keep the MVP shippable.
- Trust guardrails are non-negotiable: evidence-grounded + "insufficient evidence" default,
  **coverage not compliance %**, human decides, versioned+eval'd control library, graph-derived
  materiality, audit trail. This is what makes it defensible vs a GPT wrapper (DORA + EU AI-Act).

## Epic Tracker

| ID | Epic | Reshapes / builds on | v1? |
|---|---|---|---|
| RTV-28 | Arrangement-centric domain model + graph (Register projection) + domain-model ADR | reshapes RTV-15, RTV-18 | ✅ foundation |
| RTV-29 | Control Library (versioned + regression-eval'd) + clause→control mapping | reuses RTV-13 eval harness | ✅ |
| RTV-30 | Assessment engine (evidence-grounded, insufficient-evidence, calibrated confidence, human-approved) | extends RTV-16/17, reuses RTV-05/14 | ✅ |
| RTV-31 | TPRM lifecycle & triggers (existing / new / change + exit + periodic) | orchestrates RTV-16/17 | ✅ |
| RTV-32 | Change & impact engine (source monitor → diff funnel → semantic → graph-materiality routing) | uses RTV-14 ingestion, RTV-15 graph | ✅ (minimal) |
| RTV-33 | Provider-type modules (AI/ML first) | new | ✅ (AI module) |
| RTV-34 | Graph intake (contract-parse → propose edges → confirm; connector imports) | uses RTV-14 | ✅ |
| RTV-35 | Group governance (framework inheritance, hierarchical ABAC, consolidation, group concentration) | extends RTV-15 | ⛔ DEFERRED (schema-ready only) |

## Sequencing

- **v1 (cert + first customer):** single entity end-to-end — RTV-28 → RTV-34, with RTV-32 minimal
  and RTV-35 *schema-only*. Justification: a single entity taken fully end-to-end is stronger RNCP
  evidence and a cleaner demo than a half-built group console.
- **Later:** RTV-35 group-governance features, deeper provider-source automation, framework
  inheritance, hierarchical authz — when a design partner needs them.
