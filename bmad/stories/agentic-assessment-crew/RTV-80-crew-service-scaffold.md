---
id: RTV-80-crew-service-scaffold
title: "retrieva-assessment-crew Python service scaffold (CrewAI + LangChain + LiteLLM + A2A server; wrapper-chart + Kargo; Langfuse-only)"
status: Ready
type: Story
epic: agentic-assessment
estimate: 5
labels: [retrieva, cert, ai, devops, python]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-assessment-crew
project: 2
initiative: Certification
---

## Story

As the **platform**, I want a new **`retrieva-assessment-crew`** Python service — CrewAI + LangChain on
**LiteLLM**, exposing the **A2A** `assess-arrangement` skill from RTV-79 — deployed via the **GAP
wrapper-chart golden path** with **Kargo** promotion and **Langfuse-only** tracing, so the crew has a
home before its reasoning is built (RTV-81).

## Context / constraints

- **New member repo** of the Retrieva product (board #2) — **make it public** so org CI/Kargo secrets
  inherit (`ci-registry.md`: private repos don't get org secrets). Standardise per `conventions.md`
  (README/LICENSE/CONTRIBUTING, About panel, release-please).
- **Stateless, no DB creds** — ESO delivers only a LiteLLM key + Langfuse keys (SDD §7).
- **Kargo = git-Warehouse** (Python/temurin-class image → NewestBuild timestamp caveat, `gitops.md`);
  **block-style YAML** for the promoted `image.tag` (flow-style breaks Kargo's mutator).
- **A2A internal-only** — ClusterIP, no Ingress; netpol default-deny + allow `retrieva-backend`.
- **Langfuse-only** from day one (do **not** carry the LangSmith dual-backend pattern — see RTV-83).

## Acceptance

- [ ] Repo scaffolded: CrewAI + LangChain + LiteLLM client, an **A2A server** serving the RTV-79 Agent
      Card + `assess-arrangement` (returning the RTV-79 mock until RTV-81).
- [ ] Dockerfile (named `Dockerfile`), CI dual-push (Harbor dev + ghcr), cosign + SBOM on main.
- [ ] `services/retrieva-assessment-crew/helm` **GAP wrapper chart** (`minicloud-app-deployment` dep,
      committed `Chart.lock`, `releaseName`), `values-dev/prod`, dev+prod ArgoCD apps.
- [ ] `services/retrieva-assessment-crew/kargo/` **git-Warehouse** + dev/prod Stages (dev→prod CODEOWNERS gate).
- [ ] Netpol (default-deny + `backend⇄crew` allow) in `manifests/network-policies/`.
- [ ] ESO ExternalSecret (LiteLLM + Langfuse keys) with the SSA `ignoreDifferences` block (`gitops.md`).
- [ ] **Langfuse** tracing wired (service-level), **no `langsmith`** anywhere.
- [ ] L0/L1 green; health endpoint; the A2A Agent Card reachable in-cluster from `retrieva-backend`.

## Out of scope

The real crew reasoning (RTV-81), the human gates (RTV-82), prod promotion (gated on the QA pass).
