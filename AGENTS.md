# AGENTS.md — retrieva

Context bridge for any coding agent (Claude Code, Codex, …). Kept **tiny on purpose**: the code is
the source of truth; this states only what the repo *can't* (policy, catches, pointers). No repo
overview/stack/tree here — it's derivable and rots.

## What this repo is
The Retrieva **product/frontend + product-docs repo**. The backend lives in `retrieva-backend`; the
Python A2A crew lives in `retrieva-assessment-crew`. Each source repo builds and proves its own
artifact; none deploy directly. Deployment config lives in `minicloud-gitops/services/retrieva*/`
as GAP wrapper Helm charts.

## Source of truth / state
`git log` / `git status` + the **Retrieva GitHub Project board (#2)**. No CURRENT-STATE/HANDOFF doc —
verify any handoff against the repo (the repo wins). A local `CLAUDE.md`, if present, is **never committed**.

## Hard rules (the platform enforces these)
- **Build + prove only — Kargo owns promotion.** CI tests/scans/signs (cosign) + SBOMs and dual-pushes
  **Harbor (dev) + ghcr (prod SHA)**. Do **NOT** bump the gitops repo or edit deploy config from here.
  Kargo verifies frontend, backend and assessment crew independently in dev, assembles them in the
  `product-dev` integration gate, then `product-prod` opens one CODEOWNERS-gated release PR. This repo
  builds on `main` only.
- **Deploy config is NOT here** — image tag / replicas / ingress / secrets live in the GitOps repo.
- **Secrets:** CI org-level secrets; app secrets via **ESO→Vault**. Never hardcode/commit a secret.
  `MINICLOUD_CA_CERT` is raw PEM — never base64-decode it.
- **`main` is protected:** PR + **GPG-signed** commits; **Conventional Commits** with an **all-lowercase
  subject**, no trailing period, ≤100 chars (commitlint/husky enforced).
- **LLM calls go through the LiteLLM gateway**, governed by the backend egress NetworkPolicy — never
  call a provider directly. **Smallest safe change;** don't rewrite working architecture or delete tests.

## Catches
- CI pushes to Harbor over **Tailscale**; a stale **repo-level** `HARBOR_USER`/`HARBOR_PASSWORD`
  shadows the org secret → 401. The frontend must be **env-agnostic** (API URL injected at runtime,
  not baked) so one image runs dev+prod.
- `gh pr create/merge` has glitched org-wide → fall back to `gh api .../pulls` + `/merge` (REST).

## Start-of-task
`git status` → smallest safe change → run the repo's tests/lint/build → PR (CI + CODEOWNERS do the
rest; **don't touch the gitops repo** — Kargo promotes). Pick a **BMAD delivery path** by size
(A/B/C/E) — a one-line fix needs no PRD. Full model: `minicloud-gitops/.claude/rules/bmad*.md` + the
docs-site **BMAD Operating Model** page. (Retrieva docs + DORA cert evidence live in `docs/`.)
