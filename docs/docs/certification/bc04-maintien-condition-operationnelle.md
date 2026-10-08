---
sidebar_position: 1
title: Maintien en condition opérationnelle
---

# Dossier MCO — Retrieva (Bloc 4)

> **Livrable du Bloc 4 — « Maintenir l'application logicielle en condition opérationnelle » (ÉCRIT,
> dossier ≤ 20 pages, hors annexes et pages de garde).**
> Cette page est **l'ossature du dossier** : elle suit **exactement** les 8 rubriques du règlement
> spécial et pointe vers l'évidence (docs *Deployment / Architecture* + système en prod). À condenser
> en ≤ 20 p. pour le dépôt DigiformaCertif.

**Éliminatoires du bloc :** **C4.1.2** (supervision/alerte) · **C4.2.1** (consignation anomalies) ·
**C4.3.2** (journal de version). Les trois doivent être « acquises ».

---

## 1. Processus de mise à jour des dépendances (C4.1.1)

| Attendu (critère) | État Retrieva |
|---|---|
| Fréquence des mises à jour | lockfiles (`package-lock.json`) + `npm audit` en CI à chaque PR |
| Périmètre logiciel concerné | dépendances npm backend (Express/Drizzle/LangChain) + frontend (Next/React) |
| Type (automatique / manuel) | **manuel** aujourd'hui ⚠️ → **recommandation : activer Dependabot/Renovate** (MAJ automatisées + évaluation d'impact) |

> **Honnêteté (et axe d'amélioration pour C4.3.1) :** l'absence de Dependabot/Renovate est une lacune
> identifiée ; son activation est une recommandation argumentée du §6.

## 2. Système de supervision (C4.1.2 — **éliminatoire**)

| Attendu (critère) | Mise en œuvre |
|---|---|
| Périmètre de supervision | app (backend/frontend), datastores, workers async, coût IA |
| **Sondes** + finalité | **health checks** `GET /api/v1/health` (basic) + `/health/detailed` (dépendances) + liveness ; métriques **Prometheus** |
| Indicateurs de suivi | métriques RED (Grafana), traces + coût par requête (**Langfuse**) |
| Modalité de signalement | **Alertmanager** (alertes) + alerte de dépense IA prod ; détecteur de dérive `sdlc_loop` (bandes de contrôle) |
| Disponibilité | ArgoCD selfHeal + PDB (≥ 2 réplicas prod) |

**Évidence :** [deployment/observability](../deployment/observability.md) · `retrieva-backend/routes/healthRoutes.ts`.

## 3. Processus de collecte & consignation des anomalies (C4.2.1 — **éliminatoire**)

| Attendu (critère) | Mise en œuvre |
|---|---|
| Processus structuré, adapté au logiciel | anomalie → **issue GitHub** (gabarit) sur le Project #2 → triage/priorité → correctif PR → vérif |
| Outil de collecte | GitHub Issues (board #2) + logs Langfuse/Grafana comme source de détection |
| Informations consignées | voir la **fiche de consignation** (§4) — doit permettre de **reproduire le bug** |

## 4. Fiche de consignation d'une anomalie (C4.2.1) — gabarit + exemplaire

**Gabarit (champs minimaux pour reproduire le bug) :**

| Champ | Contenu |
|---|---|
| ID / date / auteur | — |
| Environnement | dev / prod, version (SHA / tag SemVer) |
| Criticité | 🔴/🟠/🟡 |
| Description | symptôme observé |
| **Étapes de reproduction** | 1… 2… 3… |
| Résultat attendu vs obtenu | — |
| Analyse de cause racine | — |
| Préconisation de correctif | — |
| Suivi | n° issue, PR de correction, statut |

**Exemplaire (anomalie réelle du projet) :**

| Champ | Valeur |
|---|---|
| Anomalie | **Email DOWN en prod** — `emailConfigured:false` (pas de `RESEND_API_KEY`) |
| Environnement | prod `retrieva` |
| Criticité | 🔴 |
| Symptôme | notifications/digests (surveillance, findings, invitations questionnaire) **no-op silencieux** |
| Reproduction | déclencher un événement censé notifier → aucun email émis, pas d'erreur |
| Cause racine | variable d'environnement secret manquante → service mail désactivé au boot |
| Correctif | provisionner `RESEND_API_KEY` via ESO→Vault + re-déploiement ; test de bout en bout |
| Suivi | issue **#475** |

## 5. Traitement d'une anomalie via CI/CD (C4.2.2)

| Attendu | Mise en œuvre |
|---|---|
| Le traitement tire profit de la CI/CD | correctif sur branche → PR (CODEOWNERS) → CI (lint/tests) → merge `main` → **Kargo** dev→prod → ArgoCD |
| Le correctif est décrit et résout l'anomalie | consigné dans la PR + le CHANGELOG (voir journal §7) |

Exemple traçable : fragilité des workers d'ingestion/embedding (#437–440, #433) → correctif + re-déploiement.

## 6. Recommandations d'amélioration argumentées (C4.3.1)

| Recommandation | Gain argumenté (coût / délai / perf / attractivité) |
|---|---|
| Activer **Dependabot/Renovate** | réduit la dette de sécurité (OWASP A06), MAJ continues, moins d'effort manuel |
| **HA datastore** (Postgres/Redis) | supprime le SPOF RWO → disponibilité accrue |
| Fiabiliser les **workers** (#437–440) | tient la promesse de surveillance *continue* |
| Réactiver l'**email** (#475) | restaure toute la couche notification/digest |

## 7. Journal de version (C4.3.2 — **éliminatoire**)

| Attendu | Mise en œuvre |
|---|---|
| Journal des versions + doc des correctifs | **release-please** → `CHANGELOG.md` (SemVer, commits conventionnels `fix:`/`feat:`) dans `retrieva` et `retrieva-backend` |
| Contenu (anomalies corrigées, nouvelles fonctionnalités) | généré depuis les commits conventionnels, une entrée par release |

> **Exemplaire à joindre :** extrait de `retrieva-backend/CHANGELOG.md` montrant une version avec ses
> `fix:` (anomalies corrigées) et `feat:` (évolutions).

## 8. Problème résolu en collaboration avec le support client (C4.3.3)

> **Honnêteté :** pas de support client formel en production (pas encore de clients — voir [budget
> prévisionnel §7](./bc01-budget-previsionnel.md)). À présenter via un **cas de retour utilisateur**
> (design partner / test interne) :

| Champ | Contenu |
|---|---|
| Contexte du retour | problème remonté par un utilisateur de test |
| Problème à résoudre | description |
| Résolution apportée | correctif + vérification |
| Contribution des parties prenantes | qui a signalé / qui a corrigé / qui a validé |

## 9. À finaliser avant dépôt
- Rédiger la **fiche de consignation** exemplaire complète (champ cause racine + reproduction détaillée).
- Capturer un **extrait de journal de version** réel.
- Documenter un **cas support/retour utilisateur** concret.
- Condenser en **≤ 20 pages**.
