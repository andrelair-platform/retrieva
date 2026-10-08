---
sidebar_position: 1
---

# Certification RNCP39583 — carte de preuves

**Cette section est le seul domicile de l'évidence de certification de Retrieva.** Elle vit dans la
**documentation propre à Retrieva**, même si Retrieva tourne sur cette infrastructure.

> **Nomenclature autoritative (référentiel France Compétences / YNOV, v1.01 du 15/09/2025).**
> Les intitulés ci-dessous sont ceux du **référentiel officiel RNCP39583**.

## Les 4 blocs — intitulés, modalités et livrables officiels

| Bloc | Intitulé officiel | Modalité | Livrable |
|---|---|---|---|
| **Bloc 1** | **Cadrer un projet de développement d'applications logicielles** | **ORAL** (45' : 30' prez + 15' échange)¹ | Support de présentation (cadrage client) |
| **Bloc 2** | **Concevoir et développer des applications logicielles** | **ÉCRIT** | **Code source** + dossier **≤ 30 pages** |
| **Bloc 3** | **Coordonner et piloter un projet de développement d'applications logicielles** | **ORAL** (45' : 30' prez + 15' échange) | Support de présentation **+ démo live** |
| **Bloc 4** | **Maintenir l'application logicielle en condition opérationnelle** | **ÉCRIT** | Dossier **≤ 20 pages** |

> ¹ **À confirmer avec le campus :** les modalités 2026/27 indiquent **45'** pour le Bloc 1, mais le
> règlement spécial v1.01 indique **30' (20'+10')**. Le Bloc 3 est **45' (30'+15')** dans les deux.

**Règle de validation (chaque bloc) :** un bloc est **validé** si **≥ 50 % des compétences sont
acquises** *et* **aucune compétence éliminatoire n'est « non acquise »**. La certification exige la
**validation des 4 blocs**. Jury d'évaluation = **2 professionnels externes**. Dépôt sur
**DigiformaCertif**. Livrables **strictement individuels** (plagiat = fraude).

## Comment lire cette section

Deux natures de pages coexistent dans la doc Retrieva :
- les **artefacts de certification** — rangés **par bloc** ci-dessous ;
- la **doc produit/technique** (*Strategy, Architecture, Backend, Frontend, Security, Deployment*) —
  mobilisée comme **évidence**, référencée sans être dupliquée.

---

## Bloc 1 — Cadrer *(ORAL)*

> Le candidat présente oralement le **cadrage** d'un projet logiciel à un client. Support au choix.

**Artefacts dédiés**

| Artefact | Statut | Page |
|---|---|---|
| Cahier des charges fonctionnel (document d'appui de l'oral) | ✅ v1.0 | [Bloc 1 — CdCF](./bc01-cahier-des-charges-fonctionnel.md) |
| Budget prévisionnel (C1.4.2) | ✅ v1.0 | [Bloc 1 — Budget prévisionnel](./bc01-budget-previsionnel.md) |
| **Support de présentation (slides)** | ⬜ à produire | — |

**La présentation orale doit couvrir :** cartographie des parties prenantes · analyse de la demande/
objectifs/enjeux · opportunités & menaces (SWOT) · démarche d'audit + diagnostic de l'existant ·
cartographie des risques + référentiel de risques + indicateurs · veille (sources/outils) · **étude
comparative des solutions techniques** · ressources · **diagramme de fonctionnalités / CdCF** ·
estimation de charge (j/homme) · coûts · **budget prévisionnel** · schémas d'architecture ·
préconisations + **argumentaire client**.

**Éliminatoires :** C1.1.1 (acteurs) · C1.2.2 (faisabilité) · C1.3.2 (archi technique + sécurité) ·
C1.4.1 (charge) · C1.6 (argumentaire/adhésion).

**Évidence** : [strategy/product-vision](../strategy/product-vision.md) · [product-maturity](../strategy/product-maturity.md) · [unit-economics](../strategy/unit-economics.md) · [defensibility-and-moat](../strategy/defensibility-and-moat.md) · [architecture/solution-architecture](../architecture/solution-architecture.md).

---

## Bloc 2 — Concevoir & développer *(ÉCRIT — code + dossier ≤ 30 p.)*

**Artefacts dédiés**

| Artefact | Statut | Page |
|---|---|---|
| Dossier de conception & développement (index du dossier 30 p.) | ✅ v1.0 (carte) | [Bloc 2 — Dossier conception & développement](./bc02-dossier-conception-developpement.md) |
| Audit accessibilité / RGAA (C2.2.3) | ✅ 96/100 | [Bloc 2 — Audit RGAA](./bc02-accessibility-audit.md) |
| Cahier de recettes (C2.3.1) | ⬜ à produire | — |
| Manuels (déploiement / utilisation / mise à jour) | ⬜ à produire | — |

**Le dossier écrit (≤ 30 p.) doit couvrir :** protocole de **déploiement continu** · critères qualité/
perf · protocole **d'intégration continue** · architecture maintenable · **un prototype** · frameworks
& paradigmes · **tests unitaires** · **mesures de sécurité (couverture OWASP Top 10)** · **accessibilité
(RGAA)** · historique des versions · dernière version fonctionnelle · **cahier de recettes** · plan de
correction des bogues · **manuels** (déploiement / utilisation / mise à jour) — **+ le code source**.

**Éliminatoires :** C2.2.1 (prototype + sécurité) · C2.2.2 (tests unitaires) · C2.2.3 (dév évolutif/
sécurisé/accessible) · C2.3.1 (**cahier de recettes**).

---

## Bloc 3 — Coordonner & piloter *(ORAL — gestion de projet + démo)*

> **Attention — c'est de la GESTION DE PROJET, pas du déploiement.** Le candidat présente oralement
> la **conduite du projet** et réalise une **démonstration live** du logiciel.

**Artefact dédié**

| Artefact | Statut | Page |
|---|---|---|
| Dossier de gestion de projet (appui de l'oral) | ✅ v1.0 | [Bloc 3 — Coordonner & piloter](./bc03-gestion-projet.md) |
| **Support de présentation + scénario de démo** | ⬜ à produire | — |

**La présentation orale doit couvrir :** méthodologie (justifiée) · **planning détaillé** · ressources ·
**outil de suivi** · un **cas d'arbitrage** (logigramme) · affectation des missions (**RACI**) · **style(s)
managérial(aux)** · outils de communication d'équipe · **évaluation des besoins en compétences** (grille)
· plan de développement des compétences · comptes rendus client · points de validation · indicateurs de
satisfaction · **démonstration des fonctionnalités**.

**Éliminatoires :** C3.1 (planification) · C3.2.1 (pilotage de l'avancement) · C3.4.2 (**démonstration**).

---

## Bloc 4 — Maintenir en condition opérationnelle *(ÉCRIT — dossier ≤ 20 p.)*

**Artefact dédié**

| Artefact | Statut | Page |
|---|---|---|
| Dossier MCO (monitoring, anomalies, maintenance) | ✅ v1.0 | [Bloc 4 — Maintien en condition opérationnelle](./bc04-maintien-condition-operationnelle.md) |
| Fiche de consignation d'anomalie (exemplaire) | ⬜ à finaliser | *(gabarit dans le dossier Bloc 4)* |

**Le dossier écrit (≤ 20 p.) doit couvrir :** processus de **mise à jour des dépendances** · **système
de supervision** (sondes/seuils/signalements) · **processus de collecte & consignation des anomalies** ·
**une fiche de consignation** (permettant de reproduire le bug) · **traitement d'une anomalie** (via
CI/CD) · **recommandations d'amélioration argumentées** · **un exemplaire du journal de version** · **un
problème résolu avec le support client**.

**Éliminatoires :** C4.1.2 (**supervision/alerte**) · C4.2.1 (**consignation anomalies**) · C4.3.2
(**journal de version**).

---

## Récapitulatif des artefacts dédiés

| Bloc | Modalité | Artefact | Statut |
|---|---|---|---|
| Bloc 1 | ORAL | Cahier des charges fonctionnel | ✅ |
| Bloc 1 | ORAL | Budget prévisionnel | ✅ |
| Bloc 1 | ORAL | Support de présentation | ⬜ |
| Bloc 2 | ÉCRIT | Dossier conception & développement (index) | ✅ |
| Bloc 2 | ÉCRIT | Audit RGAA | ✅ 96/100 |
| Bloc 2 | ÉCRIT | Cahier de recettes · Manuels | ⬜ |
| Bloc 3 | ORAL | Dossier de gestion de projet | ✅ |
| Bloc 3 | ORAL | Support + démo | ⬜ |
| Bloc 4 | ÉCRIT | Dossier MCO | ✅ |
| Bloc 4 | ÉCRIT | Fiche de consignation d'anomalie | ⬜ |

*(Les preuves brutes — ex. rapport RGAA — sont dans `retrieva/docs/static/certification/`.)*
