---
sidebar_position: 2
title: Solution Architecture
---

# Solution Architecture — Retrieva

> The **Solution Architecture Document**: how the whole system fits together, the non-functional
> targets, the threat model, and the decision log. This page **indexes** the detailed design docs
> (it does not duplicate them) and adds the cross-cutting views (C4, NFR, threats, ADR log).
> Owner: **SA/TL**. Reviewed at the architecture-spine + security gates.
> Certification evidence: **BC02 (concevoir & développer)** + **BC03 (déployer & sécuriser)**.

## 1. Business context
Retrieva is a **DORA-compliance RAG platform**: vendor/contract documents → AI-generated DORA
gap-analysis report → conversational Q&A, with the ICT third-party **register modelled as a graph**
(the concentration graph). It runs **on** the ktayl-solution IS (self-hosted k3s) and is the
RNCP39583 certification deliverable. Public at **retrieva.online**.

## 2. C4 — Context (who/what it talks to)

```
                         ┌──────────────┐
            Analyst /    │              │   JWT auth (own login/register)
            Compliance ─▶│   Retrieva   │◀── no external IdP dependency
            user         │  (SPA + API) │
                         └──────┬───────┘
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                      ▼
   AI platform (ai ns)     datastores (same ns)    observability
   LiteLLM gateway ──▶ EU  MongoDB (→Postgres       Langfuse (app traces)
   providers (governed)    RTV-45) · Redis/Valkey   Prometheus/Grafana
   Qdrant (vectors)        · Qdrant collection
   markitdown/docling      (per-tenant)
```
Trust boundary: Retrieva calls **only** the governed LiteLLM gateway + Qdrant + its own datastores +
Langfuse + the controller MinIO (media) — enforced by a **default-deny egress NetworkPolicy**
([security/data-protection](../security/data-protection), [llm-guardrails](../security/llm-guardrails)).

## 3. C4 — Container (the pieces, one cluster)

The view below is **generated from code** — [`docs/diagrams/retrieva_container.py`](https://github.com/andrelair-platform/retrieva/blob/main/docs/diagrams/retrieva_container.py)
(mingrammer `diagrams` + Graphviz). Edit the `.py` and re-run to refresh — no hand-drawn drift.
It shows the **target** datastore (PostgreSQL, post-RTV-45) and Authentik SSO as *planned* (today the
backend uses its own JWT auth). [Full-resolution SVG →](pathname:///img/architecture/retrieva-container.svg)

[![Retrieva C4 container view](pathname:///img/architecture/retrieva-container.svg)](pathname:///img/architecture/retrieva-container.svg)

<details>
<summary>Text version</summary>

```
 ingress-nginx (retrieva.online via Cloudflare tunnel; retrieva-dev.* via Tailscale)
   │  /api,/socket.io → backend   │  / → frontend
   ▼                              ▼
 retrieva-backend (Express 5, :3007)        retrieva-frontend (Next.js 16, :3000)
   ├─ RAG pipeline, auth (JWT), authz (RBAC + tenant)   runtime-injected API URL (env-agnostic image)
   ├─ MongoDB (app data; → PostgreSQL+Drizzle, RTV-45)
   ├─ Redis/Valkey (cache/queues)
   ├─ Qdrant (ai ns) — per-tenant vector collection
   └─ LiteLLM gateway (ai ns) — generation + embeddings (EU/governed)
```

</details>

Detail: [overview](./overview) · [rag-pipeline](./rag-pipeline) · [multi-tenancy](./multi-tenancy) ·
[concentration-graph](./concentration-graph) · [ai-infrastructure](./ai-infrastructure).

## 4. C4 — Deployment (how it runs)
Two envs (dev `retrieva-dev` / prod `retrieva`), same image. **CI builds+proves** (Harbor dev +
ghcr prod SHA, cosign+SBOM) → **Kargo** (git Warehouse: backend+frontend pinned to one commit SHA)
promotes dev→prod via a **CODEOWNERS-gated PR** → **ArgoCD** reconciles
(`minicloud-gitops/services/retrieva/`). Deploy artefact is migrating to the GAP wrapper chart
(**RTV-57**). Secrets via **ESO→Vault**; never in the image. Tight per-namespace ResourceQuotas
(`maxSurge:0` rollouts).

## 5. Non-functional requirements (register)

| NFR | Target | How met / measured |
|---|---|---|
| Availability | prod backend+frontend ≥ 2 replicas; Mongo/Redis singletons (RWO) | ArgoCD selfHeal + PDB; datastore HA = RTV-45 follow-up |
| Latency | RAG answer p95 reasonable for interactive Q&A | Langfuse trace timings; streaming responses (300s ingress timeout) |
| Scale / capacity | fits `retrieva` ns quota (req 1 CPU / 2Gi, limit 6 CPU / 6Gi, 16 pods) | `minicloud-gitops/services/retrieva/.../quota.yaml` |
| Durability / RPO | app data + vectors on Longhorn; backups platform-level | Longhorn PVC + Velero/MinIO (platform DR) |
| Security | JWT auth, RBAC+tenant isolation, PII stays in-cluster/EU, secrets in Vault | §6 threat model + [security/](../security/overview) |
| AI governance | generation/embeddings via LiteLLM only; EU residency; vision cost-gated | egress netpol + [llm-model-selection](./llm-model-selection); prod vision-spend watch |
| Observability | app traces + RED metrics + cost | Langfuse (dedicated project) + Prometheus/Grafana |
| Compliance | DORA register integrity; GDPR residency; RGAA accessibility | [dora-tprm-domain-model](./dora-tprm-domain-model) · cert BC02/BC03 |

## 6. Threat model (STRIDE-lite → mitigation)

| Threat | Vector | Mitigation |
|---|---|---|
| **Spoofing** | stolen token / weak auth | JWT access+refresh, rotation ([jwt-secret-rotation](../security/jwt-secret-rotation)); short-lived access tokens |
| **Tampering** | cross-tenant data access | tenant-scoped queries + per-tenant Qdrant collection ([multi-tenancy](./multi-tenancy), [authorization-model](./authorization-model)) |
| **Repudiation** | no audit trail | app audit logging + Langfuse trace per request (user/session tagged) |
| **Information disclosure** | PII → external LLM; secret leak | default-deny egress → LiteLLM only (EU/governed); Presidio masking at the gateway; secrets via ESO→Vault, never logged/committed |
| **DoS** | unbounded ingest / LLM spend | ingress body-size + timeouts; vision captioning gated (ingest-only, per-doc cap) + a prod spend alert |
| **Elevation of privilege** | RBAC bypass | hierarchical RBAC + domain roles + SoD (authorization-model; RTV-51→56) |
| **Prompt injection / jailbreak** | malicious doc/query | LLM guardrails ([llm-guardrails](../security/llm-guardrails)); gateway red-team gate |

## 7. ADR decision log (the *why*)

| ADR | Decision | Status | Owner |
|---|---|---|---|
| [dora-tprm-domain-model](./dora-tprm-domain-model) | the graph **IS** the DORA register (arrangement-centric) | Accepted | SA |
| [datastore-postgresql](./datastore-postgresql) | MongoDB → **PostgreSQL + Drizzle** (recursive-CTE concentration query stays typed) — RTV-45 | Accepted (pending impl) | SA/DBA |
| [authorization-model](./authorization-model) | hierarchical RBAC + domain roles + SoD (supersedes ad-hoc) — RTV-51→56 | Accepted (pending impl) | SA/SEC |
| [llm-model-selection](./llm-model-selection) | tiered models via LiteLLM; EU/governed for prod | Accepted | SA |
| [semantic-chunking](./semantic-chunking) | semantic chunking for retrieval quality | Accepted | SA |
| [multimodal-ingestion](./multimodal-ingestion) | Docling/VLM figure captioning, cost-gated (RTV-14) | Accepted | SA |
| [prompt-management](./prompt-management) | Langfuse label-routed prompts, Git fallback | Accepted | SA |
| deployment (gitops) | GAP wrapper chart + Kargo git-Warehouse — RTV-57 | Pending | DO/SA |
| identity ([minicloud-gitops ADR](https://github.com/andrelair-platform/minicloud-gitops/blob/main/docs/identity-two-layer.md)) | Retrieva ships **own JWT auth**; platform workforce = Authentik | Accepted | SA/SEC |
| ADR-AGENT-01 ([agentic-assessment-orchestrator](./agentic-assessment-orchestrator) §8) | deterministic LangGraph supervisor + a **CrewAI crew over A2A**, human-gated (Path A — amends RTV-76, keeps determinism) — RTV-77 | Accepted | SA/TL |
| ADR-AGENT-02 ([agentic-assessment-orchestrator](./agentic-assessment-orchestrator) §8) | A2A libs: **`crewai[a2a]`/`a2a-sdk`** (crew server) + **`@a2a-js/sdk`** (supervisor client), Spec v1.0 — RTV-79 | Accepted | SA/TL |
| ADR-AGENT-03 ([agentops-hitl-workspace](./agentops-hitl-workspace) §7) | **AgentOps HITL frontend** — first-class Approval Center, separated run/approval state machines, socket.io transport, backend-owned resume — RTV-84 | Accepted | SA/TL |

## 8. Risks / trade-offs
- **Single-instance Mongo/Redis** (RWO) = no datastore HA yet → accepted for now; revisit with RTV-45.
- **Dual-image git-Warehouse** coupling (backend+frontend promoted together) → deliberate (avoids
  mixed-Freight); the cost is no independent frontend-only promotion.
- **Self-hosted everything** trades managed-service convenience for sovereignty — the platform thesis.

## 9. Evolution roadmap
RTV-45 (Mongo→Postgres) → RTV-57 (wrapper chart) → RTV-51→56 (authz redesign) → datastore HA.
See the Retrieva board (#2).
