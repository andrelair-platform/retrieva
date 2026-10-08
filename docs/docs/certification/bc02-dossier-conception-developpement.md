---
sidebar_position: 1
title: Dossier conception & développement
---

# Dossier de conception & développement — Retrieva (Bloc 2)

> **Livrable du Bloc 2 — « Concevoir et développer des applications logicielles » (ÉCRIT).**
> Le livrable officiel = **le code source** + un **dossier écrit de 30 pages maximum**. Cette page est
> **l'index du dossier** : elle mappe chaque rubrique attendue à son évidence (docs *Architecture /
> Backend / Frontend / Security / Deployment* + code), sans les dupliquer. À transformer en document
> de 30 p. au moment du dépôt sur DigiformaCertif.

**Code source :** dépôts `retrieva` (frontend Next.js 16) + `retrieva-backend` (Express 5 / Node 20 TS).

---

## 1. Rubriques attendues du dossier (règlement spécial) → évidence

| # | Rubrique attendue | Mise en œuvre Retrieva | Évidence |
|---|---|---|---|
| 1 | **Protocole de déploiement continu** | CI → Harbor(dev)+ghcr(prod SHA, cosign+SBOM) → **Kargo** (git Warehouse) → PR CODEOWNERS → **ArgoCD** | [deployment/ci-cd](../deployment/ci-cd.md) |
| 2 | Critères de **qualité & performance** | pyramide de tests L0–L4, lint/typecheck, seuils de couverture, NFR | [architecture/solution-architecture §5](../architecture/solution-architecture.md) |
| 3 | **Protocole d'intégration continue** | `.github/workflows/ci.yml` (lint + typecheck + tests), `build.yml`, `release.yml` | [deployment/ci-cd](../deployment/ci-cd.md) |
| 4 | **Architecture maintenable** | couches Express (routes→controllers→services→repositories), modules, Drizzle | [architecture/solution-architecture](../architecture/solution-architecture.md) · [backend/overview](../backend/overview.md) |
| 5 | **Un prototype** (ergonomie + sécurité, C2.2.1 élim.) | SPA Next.js 16 / React 19 / shadcn/ui, parcours en 5 étapes | [frontend/overview](../frontend/overview.md) |
| 6 | **Frameworks & paradigmes** | Express 5, Next.js, LangChain (LCEL), Drizzle ORM, Zod | [architecture/overview](../architecture/overview.md) |
| 7 | **Jeu de tests unitaires** (C2.2.2 élim.) | `tests/unittest/` (vitest) + `tests/integrationtest/` + fixtures | `retrieva-backend/tests/` |
| 8 | **Mesures de sécurité — couverture OWASP Top 10** (C2.2.3 élim.) | voir §2 ci-dessous | [security/overview](../security/overview.md) |
| 9 | **Accessibilité** (référentiel présenté & justifié) | **RGAA — audit 96/100** | [Bloc 2 — Audit RGAA](./bc02-accessibility-audit.md) |
| 10 | **Historique des versions** | release-please + `CHANGELOG.md` (SemVer, commits conventionnels) | `retrieva*/CHANGELOG.md` |
| 11 | **Dernière version fonctionnelle, fiable, viable** | prod live `retrieva.online` | — |
| 12 | **Cahier de recettes** (C2.3.1 élim.) | ⬜ **à produire** (scénarios de tests + résultats attendus) | — |
| 13 | **Plan de correction des bogues** | ⬜ à produire (lien avec le Bloc 4) | — |
| 14 | **Manuel de déploiement** | ⬜ à produire (base : docker/env) | [deployment/docker](../deployment/docker.md) |
| 15 | **Manuel d'utilisation** | ⬜ à produire | — |
| 16 | **Manuel de mise à jour** | ⬜ à produire (lien Bloc 4 — dépendances) | — |

---

## 2. Couverture OWASP Top 10 (critère explicite C2.2.3)

> Le référentiel exige que *« les mesures prises permettent de couvrir les 10 failles de sécurité
> principales décrites par l'OWASP »*. Contrôles réellement présents dans `retrieva-backend`.

| OWASP Top 10 (2021) | Contrôle Retrieva |
|---|---|
| A01 — Broken Access Control | RBAC (`authorizeAction`), isolation tenant (`workspaceAuth`, `setEntityContext`, `entityScopeCondition`, `ENTITY_ISOLATION_MODE=enforce`), SoD |
| A02 — Cryptographic Failures | mots de passe **bcryptjs**, **JWT** signés, secrets **ESO→Vault**, TLS, PII in-cluster/UE |
| A03 — Injection | validation **Zod** (`validate.ts`), `xss-clean`, `securitySanitizer`, requêtes paramétrées (Drizzle), garde-fous anti-prompt-injection LLM |
| A04 — Insecure Design | modèle de menace STRIDE, garde-fous « l'IA propose, l'humain décide » |
| A05 — Security Misconfiguration | **helmet** (en-têtes), **CORS** cadré, NetworkPolicy egress default-deny |
| A06 — Vulnerable/Outdated Components | lockfile + `npm audit` en CI — ⚠️ **Dependabot/Renovate à ajouter** (voir Bloc 4) |
| A07 — Identification & Auth Failures | JWT access+refresh **+ rotation**, **MFA**, `authRateLimiter` (anti-brute-force), bcrypt |
| A08 — Software & Data Integrity Failures | images **cosign + SBOM**, CI signée, **audit log append-only** |
| A09 — Logging & Monitoring Failures | **Langfuse** (traces) + Prometheus/Grafana + audit log immuable |
| A10 — SSRF | NetworkPolicy egress default-deny (seuls LiteLLM/Qdrant/datastores/Langfuse/MinIO joignables) |

---

## 3. Points à finaliser avant dépôt
- **Éliminatoire C2.3.1 — cahier de recettes** : à rédiger (scénarios + résultats attendus). Priorité haute.
- **Manuels** (déploiement / utilisation / mise à jour) : à rédiger.
- **Plan de correction des bogues** : à formaliser (articulé avec le dossier Bloc 4).
- Condenser l'ensemble en **≤ 30 pages** (hors annexes) pour le dépôt.

## 4. Évidence Bloc 2 — où regarder
- Code : dépôts `retrieva` + `retrieva-backend`.
- Sections **Architecture**, **Backend**, **Frontend**, **Security**, **Deployment** de cette doc.
- Accessibilité : [Audit RGAA](./bc02-accessibility-audit.md).
