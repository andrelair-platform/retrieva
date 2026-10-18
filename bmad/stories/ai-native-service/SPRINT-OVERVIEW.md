# Retrieva — AI-native TPRM service (roadmap backlog)

**Product / board:** Retrieva — RNCP39583 Certification (Project #2)
**Initiative:** Certification
**Home repo:** `retrieva` · member repo `retrieva-backend`
**Reference:** [`docs/strategy/ai-native-service.md`](../../../docs/docs/strategy/ai-native-service.md)

Turns the AI-native service vision into trackable work: the **net-new (🔴)** capabilities that move
Retrieva from a TPRM tool to a managed digital workforce. The shipped foundation (agentic orchestrator,
HITL governance, register/arrangements domain, concentration graph, governed LiteLLM gateway) is the
base every item below builds on.

**Design rule for every story:** autonomous *discovery & drafting*, **never** autonomous *sign-off* —
every agent output lands in the existing HITL gates (decision inbox / approval center), runs through the
LiteLLM gateway, and is Langfuse-traced.

## Story Tracker

| ID | Epic / Story | Pillar | Phase | SP | Bloc |
|---|---|---|---|---|---|
| RTV-90 | **Epic:** Autonomous discovery agents | P1 | v2 | 13 | BC02 |
| RTV-91 | Okta / SaaS-spend connector → proposed arrangements | P1 | v2 | 8 | BC02 |
| RTV-92 | AP/ERP invoice ingestion → proposed arrangement | P1 | v2 | 8 | BC02 |
| RTV-93 | Register-completeness agent | P1 | now | 5 | BC02 |
| RTV-94 | **Epic:** Continuous CTPP & supply-chain surveillance | P5 | v2 | 13 | BC02 |
| RTV-95 | External CTPP signal ingestion (status / breach / CVE feeds) | P5 | v2 | 8 | BC02 |
| RTV-96 | Attach surveillance events to the concentration graph + alert | P5 | v2 | 5 | BC02 |
| RTV-97 | **Epic:** Automated contract redliner (Art 30) | P3 | v3 | 8 | BC02 |
| RTV-98 | Clause-gap → drafted DORA amendment for legal review | P3 | v3 | 8 | BC02 |
| RTV-99 | **Epic:** Dynamic exit strategy & transition (CIFs) | P4 | v3 | 21 | BC02 |
| RTV-100 | Alternative-provider matching | P4 | v3 | 8 | BC02 |
| RTV-101 | Exit-blueprint generator | P4 | v3 | 8 | BC02 |
| RTV-102 | Reintegration modeling | P4 | v3 | 5 | BC02 |
| RTV-103 | **Epic:** Adaptive DDQ & contradiction detection | P2 | v3 | 8 | BC02 |
| RTV-104 | Adaptive DDQ generation by criticality | P2 | v3 | 5 | BC02 |
| RTV-105 | Answer-vs-evidence contradiction detection | P2 | v3 | 5 | BC02 |
