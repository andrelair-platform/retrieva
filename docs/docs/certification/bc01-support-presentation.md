---
sidebar_position: 3
title: Support de présentation (oral)
---

# Bloc 1 — Support de présentation (plan de soutenance)

> **Support de l'épreuve orale du Bloc 1 — « Cadrer un projet de développement » (simulation : présenter
> un cadrage de projet à un client).** Ce document est le **script slide-par-slide** : contenu à
> afficher + **notes orateur** + **timing** + la **compétence éliminatoire** couverte. À convertir en
> slides (PowerPoint / Google Slides / Marp) — la structure et le minutage sont prêts.

**Format visé :** 16 slides pour **~20 min de présentation** (+ 10–15 min d'échange avec le jury).
Si le campus confirme **45'** (30' prez), on garde le même plan avec plus d'air par slide.
**Posture :** tu présentes le cadrage **à un client** (une entité financière commanditaire). Vocabulaire
pro mais **vulgarisé**.

## Matrice de couverture des 5 éliminatoires (à vérifier avant de déposer)

| Éliminatoire | Slide(s) | Preuve à l'écran |
|---|---|---|
| **C1.1.1** Cartographier les acteurs | **3** | tableau parties prenantes + rôles + utilisateurs |
| **C1.2.2** Faisabilité technique | **6 + 7** | démarche d'audit + diagnostic existant + contraintes + **verdict GO** |
| **C1.3.2** Architecture technique (étude comparative + sécurité) | **9 (+10)** | tableau comparatif + choix justifié + axes sécurité |
| **C1.4.1** Charge de travail | **12** | fonctions hiérarchisées + charge **en j/homme** |
| **C1.6** Argumentaire client / adhésion | **14 + 15** | ligne de positionnement + objections traitées + **demande de validation** |

> Les points **non-éliminatoires** du règlement (SWOT, veille, risques+indicateurs, coûts, budget,
> schémas d'archi, préconisations) sont aussi couverts ci-dessous — nécessaires pour les **≥ 50 %**.

---

## Le déroulé (16 slides)

### Slide 1 — Garde · *~0:30*
**À l'écran :** Retrieva · « Cadrage d'un produit de conformité DORA (risque tiers TIC) » · ton nom /
promo M2 / filière · date.
**Notes :** te présenter en une phrase + annoncer le fil : *« Je vous présente le cadrage de Retrieva,
de la problématique client à la décision de lancement. »*

### Slide 2 — Contexte & problématique · *~1:30*
**À l'écran :** DORA (Règl. UE 2022/2554, en vigueur 17/01/2025), pilier **tiers TIC (Art. 28–30)** ;
le chiffre choc : **ESA 2024 — 6,5 % seulement** des entités passent les 116 contrôles du Registre.
**Notes :** poser la douleur du client : *« Vos obligations DORA sur vos prestataires TIC sont
obligatoires, et 93,5 % des entités échouent — parce qu'un tableur ne tient pas l'intégrité
relationnelle. »* → c'est la problématique que le cadrage va résoudre.

### Slide 3 — Cartographie des parties prenantes 🔴 **C1.1.1** · *~2:00*
**À l'écran — tableau :**

| Acteur | Rôle | Implication |
|---|---|---|
| **Commanditaire / client** | entité financière (banque, **assureur** = ICP, PSP, asset manager) | décideur, valide le cadrage |
| **Utilisateurs** | `risk_officer`, `legal`, `analyst`, `org_admin`, `viewer` + prestataire (lien tokenisé) | usage quotidien |
| **Acteurs externes** | **régulateurs** (EBA/ESA, ACPR, ECB, CSSF) | contraignent les exigences |
| **Équipe projet** | architecte / dev / DevOps / sécu (toi, multi-casquettes + agents) | réalisation |

**Notes :** insister sur les **rôles + niveau d'implication** et les **caractéristiques des utilisateurs**
(équipes conformité réduites, 50–2000 prestataires selon le segment). → **C1.1.1 cochée.** (CdCF §6)

### Slide 4 — Analyse de la demande + veille · *~1:30*
**À l'écran :** objectifs & enjeux **par partie prenante** (client : passer le Registre ; régulateur :
intégrité ; utilisateur : onboarding rapide) · problématique = *« le Registre doit être correct par
construction »* · **veille** : sources (EBA, Neotas, DORA RTS) + outils.
**Notes :** montrer que la demande est structurée et que tu as fait une **veille réglementaire/technique**.

### Slide 5 — Opportunités & menaces (SWOT) · *~1:00*
**À l'écran :** SWOT — Opportunités (marché obligatoire, incumbents chers) / Menaces (OneTrust/Big 4,
commoditisation) / + **impact environnemental** (self-host, modèles légers) + points de vigilance.
**Notes :** relier chaque menace à une parade (profondeur ICT-TPRM, plateforme opérationnelle).

### Slide 6 — Démarche d'audit + diagnostic de l'existant 🔴 **C1.2.2 (1/2)** · *~1:30*
**À l'écran :** **démarche d'audit** (ce que tu as analysé) · diagnostic de l'existant : **tableurs/
SharePoint** (échouent à 50+ prestataires), suites GRC généralistes (DORA en surface), conseil (ponctuel) ;
environnement technique disponible = **k3s self-hosted + LiteLLM + Qdrant**.
**Notes :** *« L'audit de l'existant montre que la solution actuelle — le tableur — ne peut pas tenir
l'intégrité relationnelle exigée. »*

### Slide 7 — Faisabilité & contraintes → verdict 🔴 **C1.2.2 (2/2)** · *~1:30*
**À l'écran :** contraintes (réglementaire **DORA**, résidence **RGPD/UE**, hébergement self-host,
volume/délais, budget ≈ 0 marginal) · **avis critique de faisabilité = GO** (techniquement faisable,
réutilise un socle existant).
**Notes :** conclure explicitement : *« Décision : le projet est lançable, voici pourquoi. »* →
**C1.2.2 cochée.** (CdCF §2, §9 + budget)

### Slide 8 — Risques + référentiel + indicateurs · *~1:30*
**À l'écran :** cartographie des **risques techniques & fonctionnels** (perte de données, interruption,
sécurité, dégradation) priorisés dans un **référentiel de risques** + **suivi des incidents** +
**indicateurs de contrôle**.
**Notes :** montrer que les risques sont **hiérarchisés** et **mesurés** (pas juste listés).

### Slide 9 — Étude comparative des solutions + sécurité 🔴 **C1.3.2** · *~2:30*
**À l'écran — tableau comparatif :**

| Décision | Options | Choix justifié | Axes (sécurité / env / accessibilité) |
|---|---|---|---|
| Base de données | Mongo · **Postgres+Drizzle** · graph DB | Postgres (CTE récursive typée, intégrité) | sécurité : requêtes typées |
| LLM | cloud · **self-host gouverné (LiteLLM)** | self-host UE | données UE, pas de fuite |
| Hébergement | cloud managé · **self-host k3s** | self-host (souveraineté, coût) | egress **default-deny**, **Vault** |

**Notes :** c'est **l'éliminatoire le plus technique** — montre une **vraie comparaison** + un choix
**argumenté** avec **avantages/inconvénients** (sécurité, réseaux, accessibilité, impact env). →
**C1.3.2 cochée.** (CdCF §10 + ADRs)

### Slide 10 — Schémas d'architecture logicielle · *~1:30*
**À l'écran :** schéma C4 (context/container) + **le graphe = le Registre** (Org→Entité→Fonction→
Arrangement→Prestataire→Sous-traitant) ; architecture **maintenable, sécurisée, extensible**.
**Notes :** légender formes/flèches ; relier l'archi aux exigences des parties prenantes (slide 3).

### Slide 11 — Diagramme de fonctionnalités / CdCF · *~1:00*
**À l'écran :** les fonctions **recensées et hiérarchisées** (principales : graphe + moteur + Registre ;
secondaires : questionnaires, surveillance ; complémentaires : webhooks) — vue CdCF.
**Notes :** c'est l'entrée du chiffrage (slide 12). Mentionner l'**outil d'analyse fonctionnelle**.

### Slide 12 — Charge + coûts + budget prévisionnel 🔴 **C1.4.1** · *~2:00*
**À l'écran :** charge **en jours/homme** par lot (fonctions hiérarchisées) · découpage **MVP → V1 → V2**
· **budget prévisionnel** (postes : dev, infra, conformité SOC2/ISO) · UX prise en compte.
**Notes :** la charge **explicite en j/homme** est l'exigence précise de l'éliminatoire ; montrer
qu'elle **alimente le budget**. → **C1.4.1 cochée.** (CdCF §7, §12 + budget prévisionnel)

### Slide 13 — Préconisations / axes de solutions · *~1:00*
**À l'écran :** la recommandation (construire le MVP du moteur d'abord, socle Postgres+graphe),
priorités, jalons clés.
**Notes :** préparer le terrain à la décision (slide 15).

### Slide 14 — Argumentaire & objections 🔴 **C1.6 (1/2)** · *~1:30*
**À l'écran :** **ligne de positionnement** — *« 93,5 % des entités échouent car un tableur ne modélise
pas le graphe entité→contrat→fonction→sous-traitant. Retrieva EST ce graphe → le Registre est correct
par construction. »* · **objections traitées** : coût (ROI vs 1 M€ de non-conformité), incumbents
(profondeur ICT-TPRM), confiance (human-in-the-loop).
**Notes :** vocabulaire **vulgarisé** ; anticiper les questions du jury = les objections du client.

### Slide 15 — Décision & validation demandée 🔴 **C1.6 (2/2)** · *~1:00*
**À l'écran :** **décision proposée = GO** · prochaines étapes · **demande explicite d'adhésion/
validation du cadrage** au client.
**Notes :** terminer en **demandant la validation** (c'est le cœur de C1.6 : obtenir l'adhésion). →
**C1.6 cochée.**

### Slide 16 — Merci / Questions · *~0:30*
**À l'écran :** merci + coordonnées + « Questions ? ».
**Notes :** bascule vers les 10–15 min d'échange — garde en réserve : chiffres ESA, détail archi,
détail budget.

---

## Check-list avant dépôt (DigiformaCertif)
- [ ] Les **5 éliminatoires** sont visibles à l'écran (matrice ci-dessus) — pas seulement dites.
- [ ] Charge exprimée **en jours/homme** (slide 12) et **budget** présent.
- [ ] L'**étude comparative** (slide 9) montre ≥ 2 options **et** le choix justifié **avec sécurité**.
- [ ] La **cartographie des acteurs** (slide 3) distingue rôles / implication / utilisateurs.
- [ ] Tu **demandes la validation** du client en clôture (slide 15).
- [ ] Répétée en **≤ 20 min** (ou 30' selon le campus) ; supports lisibles, diagrammes légendés.
- [ ] Déposer **le support** + (recommandé) ce plan en annexe.

## Sources d'appui (ce qui alimente chaque slide)
[CdCF](./bc01-cahier-des-charges-fonctionnel.md) (acteurs §6, contexte §2, contraintes §9,
fonctionnel §7, architecture §10, planning §12) · [Budget prévisionnel](./bc01-budget-previsionnel.md)
· [Vision produit](../strategy/product-vision.md) (positionnement + objections) ·
[Architecture de solution](../architecture/solution-architecture.md) (C4, ADRs, sécurité).
