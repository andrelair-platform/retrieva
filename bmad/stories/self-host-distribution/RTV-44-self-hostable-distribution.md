---
id: RTV-44-self-hostable-distribution
title: "EPIC: Self-hostable distribution — public signed images + Helm chart + BYO deps + license"
status: Ready
type: Epic
epic: self-host-distribution
milestone: "RTV — Self-hosting / distribution"
estimate: 21
labels: [epic, retrieva, cert, devops, gitops, security]
priority: P2
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Epic

As a **regulated financial entity that will not put sensitive ICT-TPRM data in a multi-tenant SaaS**, I want to run Retrieva on my own infrastructure from published, signed images so that my contract/evidence/concentration data never leaves my environment — and so that adopting Retrieva does not itself add to my ICT concentration risk.

## Why

On-thesis: a DORA ICT-third-party-risk tool is itself an ICT third-party arrangement. Self-host lets
the customer avoid making Retrieva a critical third-party dependency (their models, their data, their
residency), which is a direct sales unlock for banks/insurers whose security teams refuse SaaS. The
artifacts nearly exist (signed ghcr images + SBOM + Kustomize/GitOps). **Fast-follow, not v1** — ships
after the core engine (RTV-28→43) is worth hosting.

## Scope / Acceptance (epic-level)

- [ ] AC-1: **Licensing decided FIRST** (blocks the rest) — open-core / source-available model chosen
      (e.g. community self-host free + enterprise features/support paid, or BSL); LICENSE + a clear
      "what's free vs paid" doc. No public images ship before this is settled.
- [ ] AC-2: **Public, signed, versioned images** on ghcr (`retrieva` + `retrieva-backend`) — cosign
      keyless signature + SBOM (already produced in CI) verifiable by the self-hoster; SemVer release
      tags (release-please) in addition to SHA.
- [ ] AC-3: **Helm chart** (`retrieva/charts/` or a `retrieva-charts` repo) packaging the frontend +
      backend + required config; sane defaults, values-documented; published to an OCI/GH-pages Helm repo.
- [ ] AC-4: **Bring-your-own dependencies** config surface + docs — the self-hoster points at THEIR
      LLM gateway/provider (Azure/OpenAI/self-host), embeddings, vector store (Qdrant), MongoDB, and
      (optional) Langfuse; nothing hardwired to minicloud. Runtime config only (env-agnostic image —
      the Kargo prerequisite already holds).
- [ ] AC-5: **Install / upgrade / backup / restore docs** in `retrieva/docs` (single-org install,
      TLS/ingress, secrets, DB migrations via migrate-mongo, upgrade path + breaking-change policy).
- [ ] AC-6: **Security-hardening guide** for self-hosters (non-root/read-only-fs already set,
      NetworkPolicy egress allowlist to only their LLM/vector/db, image verification, secret handling).
- [ ] AC-7: **Release-engineering discipline** documented — supported-version window, CVE/patch
      response, migration guarantees — so self-hosters have an upgrade contract.

## Reshapes / relates
- Complements the group-ready schema (RTV-28) + group governance (RTV-35): self-host is inherently
  single-org, multi-legal-entity — aligns with the group model.
- Depends on env-agnostic runtime config (already in place) + ghcr/SHA/cosign/SBOM CI (already in place).

## Key decisions to make (surface, don't bury)
1. **License model** (AC-1) — the strategic call; everything else follows.
2. **Chart home** — in-repo `charts/` vs a dedicated `retrieva-charts` repo.
3. **How much to bundle vs BYO** for the AI dependencies (docs-only BYO recommended for v1 of this epic).

## Dependencies
- Sequenced AFTER the core engine (RTV-28…RTV-43). Do not start before the product is worth hosting.
