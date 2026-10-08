---
sidebar_position: 2
title: Budget prévisionnel
---

# Budget prévisionnel — Retrieva

> **Document d'appui du Bloc 1 — « Cadrer » (ORAL) — compétence C1.4.2 (estimation des coûts /
> budget prévisionnel), en lien avec C1.4.1 (charge de travail, éliminatoire).**
> Ce document transforme « est-ce que le modèle économique tient ? » en chiffres défendables :
> investissement initial, coûts récurrents, hypothèses de revenus, compte de résultat prévisionnel
> sur 3 ans, seuil de rentabilité, plan de financement et analyse de sensibilité.
>
> Il **prolonge** le §11 du [Cahier des charges fonctionnel](./bc01-cahier-des-charges-fonctionnel.md)
> et assemble la brique [Unit economics & cost model](../strategy/unit-economics.md).

| | |
|---|---|
| **Projet** | Retrieva — DORA ICT-TPRM platform |
| **Statut** | Living — v1.0 |
| **Nature** | Budget prévisionnel (plan financier à 3 ans) |
| **Devise** | EUR |
| **Avertissement** | Chiffres en **ordre de grandeur** pour un SaaS B2B européen vendant à des entités financières réglementées — **pas des réalisés comptables**. Ils démontrent la cohérence du modèle et nomment les vrais postes de coût, sans prétendre à un P&L à l'euro près. |

---

## 1. Objet et périmètre

### 1.1 Deux périmètres, ne pas confondre (modèle à deux couches)

Le bloc BC01 attend un budget de **pilotage**. Deux périmètres coexistent et doivent rester séparés :

| Périmètre | Ce que c'est | Rôle dans le budget |
|---|---|---|
| **Contexte organisationnel — ktayl-solution IS** | Le SI assurantiel auto-hébergé (minicloud : 5 ThinkPad + 1 MacBook, k3s) sur lequel Retrieva tourne | Fournit le **CAPEX matériel sunk** et l'infrastructure mutualisée — budget d'organisation (BC01 org) |
| **Projet — Retrieva** | Le produit DORA ICT-TPRM, livrable du diplôme + produit potentiellement commercialisable | Fournit le **budget projet** : coût de construction, coût de service, projection commerciale |

### 1.2 Deux lentilles de lecture (la clé de tout ce document)

| Lentille | Définition | Coût réel |
|---|---|---|
| **A — Portfolio / certification (RÉEL)** | Retrieva tel qu'il existe aujourd'hui : livrable RNCP tournant sur le minicloud | **≈ 0 € marginal** — matériel CAPEX *sunk*, IA via modèles auto-hébergés (électricité, pas de facture d'API), équipe de un (sweat equity) |
| **B — SaaS commercial (HYPOTHÉTIQUE)** | Ce que coûterait réellement vendre et opérer ce produit pour de vrai | L'analyse des §4 à §8 |

> La grille de prix du CdCF §11 est un **modèle de prix crédible pour le marché** (lentille A). Les
> §4–§8 la **stress-testent** contre la lentille B — l'entreprise que Retrieva *serait*.

---

## 2. Investissement initial (CAPEX)

### 2.1 Lentille A — ce qui a réellement été engagé (apports)

| Poste | Montant estimé | Nature |
|---|---|---|
| Matériel cluster minicloud (5 ThinkPad d'occasion + 1 MacBook Pro 2012) | ≈ 3 000 – 6 000 € | CAPEX *sunk*, partagé avec tout le SI — **pas imputable à Retrieva seul** |
| Noms de domaine (`retrieva.online`, `devandre.sbs`) | ≈ 50 – 100 € / an | OPEX léger |
| Logiciels / licences | 0 € | Stack 100 % open-source / self-host |
| **Apport personnel en nature (temps fondateur)** | non valorisé en cash | *Sweat equity* — l'investissement réel du projet |
| **Total cash engagé (imputable projet)** | **≈ 0 € marginal** | Le matériel est un coût d'organisation, pas de projet |

> **Message de pilotage :** l'investissement réel de Retrieva n'est **pas** du capital mais du
> **temps** (conception, développement, architecture). C'est précisément la force du modèle
> self-host : le coût marginal de construire et faire tourner le livrable de certification est
> proche de zéro.

### 2.2 Lentille B — CAPIT­AL initial nécessaire à un lancement commercial

Pour **vendre** à des entités financières réglementées, un investissement initial incompressible
apparaît (il n'existe pas en lentille A) :

| Poste | Montant estimé | Pourquoi incompressible |
|---|---|---|
| Certification **SOC 2 Type II** + **ISO 27001** (audit initial) | 40 000 – 80 000 € | Une banque/un assureur n'achète pas d'outil DORA à un fournisseur non certifié |
| Pentest initial + remédiation | 10 000 – 20 000 € | Exigence de due-diligence fournisseur |
| Constitution juridique (société, CGU/CGV, DPA, DPO externalisé) | 5 000 – 15 000 € | Vente B2B réglementée |
| Cloud managé / passage hors self-host (si exigé par le client) | variable | Beaucoup d'entités refusent le multi-tenant → tier self-host (RTV-44) |
| **CAPEX initial commercial** | **≈ 55 000 – 115 000 €** | Le ticket d'entrée sur le marché |

---

## 3. Modèle de revenus (hypothèses)

### 3.1 Grille de prix (rappel CdCF §11)

| Offre | Prix | Cible |
|---|---|---|
| Starter | 199 € / mois | petite entité, estate réduit |
| Professional | 499 € / mois | mid-market |
| Business | 999 € / mois | estate important |
| Pilote payant (PoV) | 5 000 – 15 000 € (1–3 mois) | preuve sur les vrais prestataires du client |
| Mid-market (abonnement annuel) | 12 000 – 30 000 € / entité / an | |
| Entreprise / groupe (multi-entités + self-host) | 60 000 – 150 000 €+ / an | |

### 3.2 Métrique de valeur et ARPU
- **Métrique de valeur :** taille de l'estate tiers (nombre d'arrangements/prestataires gérés) —
  aligne le prix sur la surface de risque du client, métrique correcte pour la TPRM DORA.
- **ARPU mixte retenu pour la projection :** **≈ 500 € / mois ≈ 6 000 € / an**.

### 3.3 Coût de service par client (marginal)

| Poste | € / client / mois | Note |
|---|---|---|
| Infra cloud (Postgres + app + vecteurs + workers) | 30 – 80 | baisse avec la densité de tenants |
| IA (embeddings + RAG + appels LLM d'évaluation) | 20 – 100 (API payantes) · ≈ 0 (GPU self-host) | seul poste qui scale avec l'**usage** |
| **Coût de service total** | **≈ 50 – 150** | |

### 3.4 Marge brute par plan

| Plan | Prix / mois | Coût de service (est.) | Marge brute |
|---|---|---|---|
| Starter | 199 € | ~60 € | ~70 % |
| Professional | 499 € | ~90 € | ~82 % |
| Business | 999 € | ~150 € | ~85 % |
| Enterprise | sur devis | négocié | — |

> **Verdict :** chaque plan est **margin-positive** dès le premier client, avec des marges brutes
> 70–85 % typiques du SaaS B2B.

---

## 4. Coûts récurrents (OPEX)

### 4.1 Base fixe commerciale (lentille B) — non couverte par le prix jusqu'au volume

| Poste | € / an | Pourquoi incontournable |
|---|---|---|
| **Conformité** — SOC 2 Type II (maintien), ISO 27001, pentests annuels, DPO, cyber-assurance, juridique | 100 000 – 200 000 | ticket d'entrée du marché réglementé |
| **Équipe** — 2–3 ingénieurs + support/CSM + commercial (chargés) | 300 000 – 500 000 | construire, opérer, vendre, supporter |
| **Vente & marketing / CAC** | 5 000 – 20 000 € par logo | cycles B2B-fintech longs |
| **Base fixe** | **≈ 0,5 – 1,0 M€ / an** | |

> **Enseignement de pilotage :** le coût dominant d'un SaaS fintech réglementé est **conformité +
> équipe**, *pas* l'infrastructure. C'est **pourquoi** Retrieva est bâti dès le jour 1 sur une
> plateforme compliance-first (Vault, PKI, pistes d'audit, contrôles DORA) : cela dé-risque le poste
> fixe le plus cher.

---

## 5. Compte de résultat prévisionnel — 3 ans (lentille B)

Scénario **médian**, hypothèses : ARPU 6 k€/an, contribution ~4,8 k€/an/client, cycle de vente long
(entités financières), montée en charge prudente d'un projet solo → design partners → abonnements.

| | **Année 1** (MVP + pilotes) | **Année 2** (premiers abonnements) | **Année 3** (montée en charge) |
|---|---|---|---|
| Clients payants (fin d'année) | 3 pilotes (PoV) | 12 | 40 |
| **Revenus** | 30 000 € | 90 000 € | 280 000 € |
| Coût de service (marginal) | ~4 000 € | ~17 000 € | ~55 000 € |
| **Marge brute** | ~26 000 € | ~73 000 € | ~225 000 € |
| Conformité (SOC2/ISO/pentest/DPO/assurance) | 20 000 € (démarrage) | 120 000 € | 160 000 € |
| Équipe (chargée) | 60 000 € (fondateur + renfort partiel) | 350 000 € | 550 000 € |
| Vente & marketing | 15 000 € | 60 000 € | 120 000 € |
| **Total charges fixes** | **95 000 €** | **530 000 €** | **830 000 €** |
| **Résultat net (EBIT)** | **≈ −69 000 €** | **≈ −457 000 €** | **≈ −605 000 €** |
| **Burn cumulé** | −69 000 € | −526 000 € | **≈ −1,13 M€** |

> **Forme normale d'un SaaS :** le prix unitaire couvre le coût marginal et **contribue** à la base
> fixe ; l'écart jusqu'à ~100–200 clients est comblé par la rampe de revenus **ou une levée**. Les
> années 1–3 sont des **années d'investissement**, financées par le capital ; la rentabilité arrive
> au-delà (voir §6).

**Scénarios bas / haut (sensibilité principale = vitesse d'acquisition) :**
- **Bas** (cycles plus longs, ~20 clients en Y3) → burn cumulé ~1,3 M€, break-even repoussé.
- **Haut** (traction incubateur + 1 partenaire distributeur, ~70 clients en Y3) → burn cumulé
  ~0,9 M€, break-even approché en Y4.

---

## 6. Seuil de rentabilité

Avec un ARPU mixte ≈ 500 €/mois et un coût de service ≈ 100 €/mois → **contribution ≈ 400 €/mois
(~4,8 k€/an) par client** :

```
clients au point mort = base fixe / contribution par client
                      = 0,5 – 1,0 M€ / 4,8 k€
                      ≈ 100 – 210 clients payants
```

| Base fixe annuelle | Clients au point mort |
|---|---|
| 0,5 M€ | ~105 |
| 0,75 M€ | ~156 |
| 1,0 M€ | ~210 |

> **Claim honnête :** *unit-profitable dès le client #1, structurellement rentable à ~100–200
> clients.* Aucun prix sticker de SaaS early-stage ne finance seul une opération fintech certifiée —
> et ce modèle ne le prétend pas. Compte tenu de la rampe du §5, le point mort est atteignable en
> **Année 4–5**.

---

## 7. Plan de financement et besoins

### 7.1 Besoin de financement (lentille B)
- **Burn cumulé à couvrir sur 3 ans ≈ 0,9 – 1,3 M€** (scénarios haut → bas).
- **Besoin de premier tour réaliste : ~1,0 – 1,5 M€ (pre-seed / seed)** pour atteindre ~50–70
  clients et la certification SOC 2/ISO, puis viser le point mort sur une rampe de 4–5 ans.

### 7.2 Besoins non financiers (ce qu'un incubateur apporte)
Au stade actuel, le levier le plus utile n'est **pas** le cash mais :

| Besoin | Pourquoi |
|---|---|
| **Accès à des design partners / 1–3 pilotes payants** (entités financières UE) | La seule preuve qui compte ; débloque tout le reste |
| **Un co-fondateur / profil commercial (vente & marketing)** | Faiblesse structurelle n°1 reconnue (CdCF §15.2) — indispensable au marché « trust & sales » |
| Mise en réseau réglementaire (relations auditeurs, ESN du secteur) | Raccourcit le cycle de vente B2B-fintech |
| Accompagnement go-to-market + crédibilité de marque | Compense l'absence de logos/références d'un fournisseur inconnu |

### 7.3 Garde-fou de coût (le seul poste qui peut déraper)
Le coût de service **IA sur providers payants en usage intensif** est la seule ligne variable à
risque. Posture (décision #628) :
1. **IA « incluse / fair-use »** — pas de metering par requête ; limiteur d'abus
   (`ragRateLimiter`, 100 req/h authentifiées) borne le pire cas.
2. **Instrumenter le coût IA par organisation** via les métriques de dépense de la passerelle LiteLLM.
3. **Revisiter le metering seulement si** une organisation dépasse une part définie de son prix.
   D'ici là, les modèles auto-hébergés maintiennent le coût marginal proche de zéro.

---

## 8. Ce que ce budget prouve (pilotage BC01)

- Le prix est **adossé à un modèle de coût**, pas deviné — un artefact de *pilotage / budget*.
- Le coût dominant d'un SaaS fintech réglementé est **conformité + équipe**, pas l'infrastructure —
  ce qui **justifie** l'investissement plateforme compliance-first dès le départ.
- Le modèle **nomme ses propres hypothèses et garde-fous** (déclencheur de coût IA, sensibilité à
  l'acquisition) : c'est l'essence du pilotage — décider avec les chiffres visibles.
- La **distinction des deux lentilles** (réel ≈ 0 € vs commercial ~1 M€/an) montre une lecture
  lucide : Retrieva est aujourd'hui un **livrable de certification à coût marginal nul**, et un
  **projet commercial finançable** dont le chemin de rentabilité est chiffré et daté.

---

## 9. Annexes

### 9.1 Synthèse des hypothèses

| Hypothèse | Valeur retenue |
|---|---|
| ARPU mixte | 6 000 € / an (500 €/mois) |
| Coût de service / client | 1 200 € / an (100 €/mois) |
| Contribution / client | 4 800 € / an |
| Marge brute | 70–85 % |
| Base fixe annuelle (cible) | 0,5 – 1,0 M€ |
| CAC | 5 000 – 20 000 € / logo |
| Clients au point mort | 100 – 210 |
| Horizon de point mort | Année 4–5 |
| Besoin de financement (3 ans) | 0,9 – 1,3 M€ |

### 9.2 Références
- [Unit economics & cost model](../strategy/unit-economics.md) (brique source)
- [Cahier des charges fonctionnel §11](./bc01-cahier-des-charges-fonctionnel.md) (modèle économique)
- [Maturité & pricing](../strategy/product-maturity.md) (tiers, cut-line MVP)
- Décision #628 (posture coût IA)
