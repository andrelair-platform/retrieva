---
sidebar_position: 1
title: Coordonner & piloter (gestion de projet)
---

# Dossier de gestion de projet — Retrieva (Bloc 3)

> **Document d'appui du Bloc 3 — « Coordonner et piloter un projet de développement d'applications
> logicielles » (ORAL, 45' : 30' prez + 15' échange + démonstration live).**
> ⚠️ Ce bloc porte sur la **conduite de projet** (méthodologie, planning, suivi, arbitrage,
> management, communication, démo) — **pas** sur le déploiement/sécurité (ceux-ci relèvent du Bloc 2).
> Le **support de présentation + le scénario de démo** restent à produire à partir de ce dossier.

> **Spécificité projet solo (à assumer à l'oral).** Retrieva est porté par **un fondateur unique**,
> assisté d'**agents IA** et s'exécutant dans le **contexte organisationnel ktayl-solution** (15 rôles
> types + RACI). Les compétences « management d'équipe » (C3.3) sont donc présentées via : (a) le
> **cumul de casquettes** formalisé en RACI, (b) la **délégation à des agents** (orchestration BMAD),
> (c) le cadre d'équipe simulé par l'IS ktayl. C'est une posture honnête et défendable, à condition de
> l'expliciter — ne pas prétendre à une équipe humaine qui n'existe pas.

---

## 1. Méthodologie (C3.1 — éliminatoire)

| Attendu | Mise en œuvre | Bénéfice (à argumenter) |
|---|---|---|
| Méthodologie choisie + justification | **Agile story-driven via BMAD** (Breakthrough Method of Agile AI-driven Development), **trunk-based** | cycles courts, story→issue→PR traçable, revue continue |
| Cadre méthodologique | stories `RTV-xx` → issues → PR → `main` → Kargo dev→prod | discipline de livraison reproductible |

**Évidence :** BMAD (`bmad/stories/` du dépôt `retrieva`), règles `.claude/rules/bmad.md` + `agile-execution.md`.

## 2. Planning détaillé & ressources (C3.1 — éliminatoire)

| Attendu | Mise en œuvre |
|---|---|
| Planning découpé (phases/tâches/lots) | sprints BMAD + jalons de maturité **MVP → MLP → V1 → V2** ([product-maturity](../strategy/product-maturity.md)) |
| Outil de planification | **GitHub Project #2** (champs *Status / Priority / Sprint (itération) / Effort / Kind*) ; vue Roadmap |
| Ressources humaines | fondateur (cumul de rôles) + agents IA (voir RACI §4) |
| Ressources matérielles | cluster minicloud (6 nœuds k3s) — contexte ktayl |
| Ressources financières | [budget prévisionnel (Bloc 1)](./bc01-budget-previsionnel.md) |

## 3. Pilotage de l'avancement (C3.2.1 — éliminatoire)

| Attendu | Mise en œuvre |
|---|---|
| Outil de suivi | **GitHub Project #2** (board, itérations) + dashboard Grafana « Delivery Portfolio » |
| Indicateurs mesurables (délais/coûts/qualité) | avancement sprint, sous-issues, priorités, coût IA (Langfuse), santé CI |
| Tableaux de bord | board #2 + Grafana + journal de session `CLAUDE.md` |

## 4. Affectation des missions & RACI (C3.1 / C3.3.1)

Matrice RACI (rôles × phases) — le fondateur **cumule** R/A ; la matrice montre **quelle casquette**
est responsable à chaque phase (couverture complète du SDLC). *(Reprise de la gouvernance du CdCF.)*

| Rôle \ Phase | P1 Cadrage | P2 Archi | P3 Dév | P4 Infra/CI | P5 Test/Sécu | P6 Run |
|---|---|---|---|---|---|---|
| PM / BA | R | C | C | I | C | C |
| SA / TL | C | A/R | A/R | C | C | C |
| FE / BE / DBA | I | C | R | C | C | I |
| DevOps / SRE | I | C | C | A/R | C | A/R |
| QA / SEC | I | C | C | C | A/R | C |

> **Délégation aux agents (style délégatif).** Les tâches répétitives/implémentation sont déléguées à
> des **agents IA** supervisés (BMAD `/bmad-build`, revues `/bmad-code-review`) — le fondateur garde
> R/A sur les décisions à responsabilité (sécurité, architecture, promotion prod).

## 5. Cas d'arbitrage (C3.2.2)

Exemple à présenter (avec logigramme) : **MongoDB → PostgreSQL + Drizzle** (RTV-45).
- **Problématique :** la requête de concentration nth-party (CTE récursive) et l'intégrité relationnelle
  du Registre DORA sont mal servies par MongoDB.
- **Options :** rester sur Mongo (agrégations) · passer à Postgres+Drizzle · base graphe dédiée.
- **Décision argumentée :** Postgres+Drizzle (CTE récursive typée, intégrité, standard CNPG) — voir
  [datastore-postgresql](../architecture/datastore-postgresql.md).

Autre arbitrage présentable : **ligne de coupe MVP** (refuser d'intégrer les triggers V1/V2 pour
valider d'abord le cœur) — [product-maturity](../strategy/product-maturity.md).

## 6. Management & communication (C3.3.1)

| Attendu | Mise en œuvre (contexte solo + IS ktayl) |
|---|---|
| Style(s) managérial(aux) | **directif** sur les gates sécurité/prod · **délégatif** vers les agents · **participatif** dans les revues |
| Outils de communication d'équipe | l'IS ktayl : Matrix/Element, Mail (Stalwart), Nextcloud, Backstage |
| Prise en compte du handicap | accessibilité **RGAA** du produit ([Audit RGAA](./bc02-accessibility-audit.md)) comme engagement inclusif |

## 7. Besoins en compétences & plan de développement (C3.3.2)

| Attendu | Mise en œuvre |
|---|---|
| Grille d'évaluation des compétences | matrice « compétence requise × niveau » (K8s/GitOps, RAG/LLMOps, domaine DORA, sécurité) |
| Plan de développement | montée en compétences documentée (ADR, docs d'architecture, veille) |

> ⚠️ **Point d'attention (non-éliminatoire mais ≥50 %).** C3.3.1 et C3.3.2 (management d'équipe, RH) sont
> les plus durs en solo. Les présenter via la **grille de compétences** + la **délégation agents** +
> le **cadre d'équipe ktayl** ; rester honnête.

## 8. Suivi client & validation (C3.4.1 — C3.4.2 éliminatoire)

| Attendu | Mise en œuvre |
|---|---|
| Comptes rendus d'activité | journaux de session `CLAUDE.md` + notes de PR + CHANGELOG |
| Points de validation | **gates CODEOWNERS** (revue obligatoire avant prod) + QA gate live |
| Indicateurs de satisfaction | checklist d'acceptation MVP + retours de recette |
| **Démonstration (C3.4.2, éliminatoire)** | **démo live de `retrieva.online`** devant le jury — parcours 5 étapes (classer → questionnaire → analyse d'écart → revue de contrat → surveillance) |

**Éliminatoires du bloc :** **C3.1** (planification) · **C3.2.1** (pilotage avancement) · **C3.4.2**
(démonstration). Les trois doivent être « acquises ».

## 9. À produire avant l'oral
- **Support de présentation** (slides) couvrant les 8 rubriques ci-dessus.
- **Scénario de démonstration** répétable de `retrieva.online` (jeu de données de démo prêt).
- **Grille d'évaluation des compétences** + **plan de développement** formalisés.
- Un **logigramme** du cas d'arbitrage choisi.
