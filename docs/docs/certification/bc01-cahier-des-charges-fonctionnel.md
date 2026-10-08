---
sidebar_position: 1
title: Cahier des charges fonctionnel
---

# Cahier des charges fonctionnel (CdCF) — Retrieva

> **Document d'appui du Bloc 1 — « Cadrer un projet de développement d'applications logicielles » (ORAL).**
> ⚠️ Le Bloc 1 est une **épreuve orale** (présentation d'un cadrage à un client) : ce CdCF est le
> **document de fond** sur lequel s'appuie l'oral (il alimente le diagramme de fonctionnalités / CdCF,
> l'étude comparative, l'estimation de charge et le budget attendus). Le **support de présentation**
> (slides) reste à produire séparément. Intitulé officiel du bloc = **Cadrer**, pas « Piloter ».
> Document de référence du projet : il formalise le besoin, le périmètre, les exigences
> fonctionnelles et non-fonctionnelles, les contraintes, le modèle économique, le planning et la
> gouvernance de **Retrieva**, plateforme de gestion du risque lié aux tiers prestataires de
> services TIC au titre du règlement **DORA**.
>
> Il **assemble** en un document unique les artefacts de conception déjà produits (vision produit,
> modèle de domaine DORA ICT-TPRM, architecture de solution, modèle économique) — chacun reste
> détaillé dans sa page dédiée, référencée ici.

| | |
|---|---|
| **Projet** | Retrieva — DORA ICT Third-Party Risk Management platform |
| **Statut** | Living — v1.0 |
| **Porteur** | AndreLiar (fondateur unique) |
| **Certification** | RNCP39583 — **Bloc 1 (Cadrer, ORAL)** · évidence transverse Bloc 2/3/4 |
| **Contexte organisationnel (BC01)** | ktayl-solution IS (SI de l'organisation assurantielle minicloud) — voir le modèle à deux couches |
| **URL produit** | `retrieva.online` |
| **Documents compagnons** | [Vision produit](../strategy/product-vision.md) · [Modèle de domaine DORA ICT-TPRM](../architecture/dora-tprm-domain-model.md) · [Architecture de solution](../architecture/solution-architecture.md) · [Maturité & pricing](../strategy/product-maturity.md) · [Unit economics & budget](../strategy/unit-economics.md) · [Défensibilité & moat](../strategy/defensibility-and-moat.md) |

---

## 1. Objet et portée du document

Ce CdCF définit **ce que Retrieva doit faire et pourquoi**, indépendamment de la manière dont il
est codé. Il sert trois lecteurs :

1. **Le jury RNCP39583** — comme pièce de cadrage du bloc BC01 (pilotage : besoin, périmètre,
   budget, gouvernance).
2. **Le porteur de projet** — comme référentiel d'arbitrage (tout changement de périmètre se juge
   contre ce document).
3. **Un futur client / investisseur** — comme expression structurée du besoin métier et de la
   proposition de valeur.

> **Rappel du modèle à deux couches (ne jamais confondre).** La certification **projet = Retrieva**.
> Le **ktayl-solution IS** (le SI assurantiel auto-hébergé sur lequel Retrieva tourne) est son
> **contexte organisationnel** : il fournit l'évidence de niveau organisation (BC01 cadrage/budget/
> gouvernance). Retrieva fournit l'évidence de niveau projet (BC02/BC03/BC04).

---

## 2. Contexte et enjeux

### 2.1 Le cadre réglementaire

**DORA** — *Digital Operational Resilience Act*, **règlement (UE) 2022/2554** — est **en vigueur
et applicable depuis le 17 janvier 2025**. Il impose aux entités financières de l'UE (banques,
assureurs, PSP, gestionnaires d'actifs) un cadre contraignant de résilience opérationnelle
numérique. Son **pilier « risque lié aux tiers prestataires TIC »** (articles 28 à 30) impose
notamment :

| Obligation | Référence DORA |
|---|---|
| Diligence raisonnable pré-contractuelle (proportionnée) | Art. 28(4) |
| Surveillance continue des arrangements | Art. 28(7) |
| **Registre d'information** (Register of Information, RT.02.01) | Art. 28(3) |
| Gestion du **risque de concentration** | Art. 29 |
| Sous-traitance (nth-party) / droit d'objection aux changements | Art. 30(2)(a) |
| Clauses contractuelles obligatoires (12 clauses) | Art. 30(2)(a)–(h) + 30(3)(a)–(d) |
| Stratégie de sortie | Art. 28(8) |
| Responsabilité de l'organe de direction | Art. 5, 28(1) |

### 2.2 Le problème — validé par le régulateur lui-même

Il ne s'agit pas d'un besoin supposé mais d'un **échec démontré par l'exercice du régulateur**.
Lors du **« dry run » ESA 2024**, chaque Registre d'information a été soumis à **116 contrôles de
qualité des données — seules 6,5 % des entités ont réussi l'ensemble**. Les trois défaillances les
plus fréquentes :

1. **Données contractuelles incomplètes**
2. **Information sous-traitants (nth-party) manquante**
3. **Classification CIF (fonction critique/importante) erronée**

Cause racine citée : *« un tableur ne peut pas maintenir l'intégrité relationnelle requise entre
entités, contrats et fonctions »* — les registres sur tableur *« échouent typiquement dès la
première soumission formelle »* dès ~50 prestataires.

En parallèle, le **coût** de la conformité est élevé (≈ la moitié des firmes britanniques ont
dépensé > 1 M€) et la **pénurie d'expertise** frappe surtout les entités de taille moyenne.

> **Ligne de positionnement :** *« 93,5 % des entités ont échoué aux contrôles de qualité du
> Registre parce qu'un tableur ne sait pas modéliser le graphe entité→contrat→fonction→
> sous-traitant. Retrieva EST ce graphe — le Registre est donc correct par construction. »*

**Sources :** EBA — *2024 DORA Dry Run* (6,5 % / 116 contrôles) · Neotas — *DORA TPRM 2026* ·
Infosecurity Magazine — déficit de ressources des petites firmes · Fintech Global — *true cost of
DORA non-compliance (>1 M€)*. (Liens dans la [vision produit](../strategy/product-vision.md).)

### 2.3 Les alternatives actuelles et leurs limites

| Alternative | Limite |
|---|---|
| **Tableurs** (Excel/SharePoint) | Pas d'intégrité relationnelle → échec aux contrôles ESA ; revue manuelle de 100+ pages par prestataire |
| **Suites GRC généralistes** (OneTrust, ServiceNow, Archer, MetricStream) | DORA traité comme un module parmi 50 — superficiel ; pas de signature clause-à-clause Art. 30, pas de graphe nth-party, coût élevé |
| **Cabinets de conseil (Big 4)** | Coûteux, ponctuel, non opérationnel en continu |

---

## 3. Expression du besoin

### 3.1 Besoin métier (le « quoi »)

> **Transformer la conformité DORA « tiers TIC » d'une revue manuelle de 300 pages en un pipeline
> continu, assisté par IA et gouverné par l'humain :** dépôt des preuves prestataire → cartographie
> automatique vers DORA Art. 28–30 → scoring du risque → **ratification humaine** → Registre
> d'information maintenu à jour en continu.

### 3.2 Les 9 douleurs adressées (dérivées du terrain)

| # | Douleur actuelle | Capacité Retrieva |
|---|---|---|
| 1 | Onboarding prestataire : lecture manuelle de 100+ pages | Pipeline RAG → analyse d'écart citée en **2–5 min** |
| 2 | Revue des 12 clauses Art. 30 non systématique | Scoring clause-à-clause `accept/reject/waive` + compteur de tours de négociation + piste d'audit |
| 3 | Questionnaires fournisseurs : friction de connexion | Liens tokenisés `/q/<token>` — le prestataire ne crée pas de compte |
| 4 | Scoring de risque « boîte noire » | Formule **déterministe** et visible (score inhérent + efficacité contrôles + plancher résiduel) rejouable par un auditeur |
| 5 | Registre d'information (Art. 29) : 2–4 FTE-semaines/cycle | Export **« RoI » en un bouton** depuis le graphe |
| 6 | Surveillance manuelle (expiry certs, dates contrat) | Scan 24 h + alertes (seuils 90/30/7 j) |
| 7 | Décisions de risque non durables | Décision `proceed/conditional/reject` horodatée, signée, motivée, conservée |
| 8 | Besoin d'isolation multi-équipes | Multi-tenant par conception (Organisation → Workspace → membres, RBAC) |
| 9 | Besoin bilingue réglementaire | EN/FR de bout en bout (AMF, CSSF, Banque de France) |

### 3.3 Workflow en 5 étapes (mapping 1:1 avec DORA)

1. **Classer le prestataire** (Art. 28) — tier + type de service
2. **Questionnaire de due-diligence** (Art. 28/30) — envoi + réponse scorée
3. **Analyse d'écart** (Art. 28/29) — dépôt des documents TIC + analyse IA
4. **Revue de contrat** (Art. 30) — vérification des 12 clauses obligatoires
5. **Surveillance** — certifications + prochaine revue → alertes automatiques

---

## 4. Périmètre du projet

### 4.1 Dans le périmètre (MVP et au-delà)

- Le **graphe d'arrangements** (= le Registre) : Organisation → Entité légale → Fonction métier →
  Arrangement TIC → Prestataire → Sous-traitant.
- Le **moteur d'évaluation** piloté par une **bibliothèque de contrôles versionnée** (DORA article
  → contrôle → preuve attendue → motifs de correspondance de clause).
- La **projection du Registre d'information RT.02.01** depuis le graphe (export XLSX/CSV).
- Les **3 déclencheurs** d'un même cycle de vie (🟡 prestataire existant, 🟢 nouveau prestataire,
  🔴 changement/surveillance) + sortie/périodique.
- Le **graphe de concentration nth-party** (Art. 29) — le différenciateur.
- Les **garde-fous de confiance** (évidence citée, verdict « preuve insuffisante », l'humain
  décide).
- Multi-tenant, authentification/RBAC, surveillance, questionnaires tokenisés, bilingue EN/FR.

### 4.2 Hors périmètre (délibérément, et ne sera pas ajouté)

Retrieva est un **spécialiste profond** de DORA Art. 28–30. Il **n'intègre pas** mais **se connecte
à** (via API/webhooks) :

| Domaine exclu | Raison | Intégration |
|---|---|---|
| Due-diligence financière (D&B, KYC/AML) | Autre persona, outillage mature | Webhook entrant |
| Évaluation ESG (EcoVadis, CSRD) | Autre réglementation, autre acheteur | Webhook entrant |
| Screening sanctions/PEP (World-Check) | Domaine AML | Webhook entrant → Finding critique |
| Notation de posture de sécurité (BitSight, SecurityScorecard) | Autre surface produit | Webhook entrant/sortant |
| Achats / gestion des dépenses (Coupa, Ariba) | Hors conformité | n/a |
| **Rédaction** de contrats | Retrieva fait la **revue**, pas la génération | n/a |

### 4.3 Exclusions de maturité (MVP) — justifiées

Le **MVP** prouve le moteur sur l'estate **existant** (🟡) d'**une seule entité légale** prise de
bout en bout. Sont **différés** (mais le schéma les anticipe) :

- Déclencheurs 🟢 nouveau prestataire et 🔴 changement (réutilisent le même moteur — V1.0).
- Module « type de prestataire » (IA/ML en premier) — différenciateur, pas nécessaire à la
  validation du cœur.
- Automatisation de l'alimentation du graphe (saisie manuelle au MVP).
- **Gouvernance de groupe / self-host** (multi-entités) — expansion V2, schéma prêt mais
  fonctionnalités différées.

---

## 5. Objectifs et indicateurs de succès

### 5.1 Objectif maître (principe produit n°1)

> **Le KPI maître est le *time-to-go-live* d'un nouveau prestataire/partenaire**, pas le « score de
> conformité ». La conformité est un **sous-produit** d'un onboarding rapide.

### 5.2 Indicateurs cibles

| Indicateur | Cible |
|---|---|
| Onboarding d'un nouveau partenaire | 1–2 semaines (vs 8–12 en mode tableur), chemin « urgent » < 2 semaines |
| Renouvellement annuel | < 1 jour de temps juridique / contrat (vs 4–6 semaines) |
| Analyse d'écart d'un document | 2–5 minutes |
| Export du Registre RT.02.01 | 1 bouton (vs 2–4 FTE-semaines/cycle) |
| Délai événement → notification | Secondes |

### 5.3 Objectifs de certification (RNCP — priorité)

Retrieva est **un projet de certification d'abord**. Pour le diplôme, l'atteinte qui compte est **un
MVP démontrable + une architecture défendable + l'évidence**, et non un chiffre de MRR. L'objectif
commercial (voir §11) est réel mais **secondaire** à la livraison du MVP du moteur d'évaluation.

### 5.4 Objectifs commerciaux (secondaires, horizon design-partners)

Cible réaliste pour un projet solo : **MVP + 5–20 design partners / 1–3 pilotes payants (PoV
5–15 k€)**, et non un compteur d'utilisateurs.

---

## 6. Acteurs et parties prenantes

### 6.1 Segments cibles (ICP)

| Segment | Échelle typique | Valeur maximale |
|---|---|---|
| **Banques** | 500–2000 prestataires TIC | Triage auto par fonction TIC (critique vs importante vs standard) |
| **Assureurs** *(ICP de lancement)* | 50–500 prestataires | Scorecard de signature des clauses Art. 30 + tours de négociation |
| **Paiements / PSP** | 100–500 prestataires | Risque de concentration (Art. 29) + export RoI |
| **Gestionnaires d'actifs** | 50–300 prestataires | Équipes conformité réduites (3–10) sur 200+ prestataires |

### 6.2 Rôles utilisateurs (personas)

| Persona | Rôle applicatif | Besoin principal |
|---|---|---|
| Responsable des risques (*risk officer*) | `risk_officer` | Décision formelle de risque, approbation plan de sortie |
| Juriste | `legal` | Signature des clauses Art. 30 |
| Analyste conformité | `analyst` / `compliance` | Analyses d'écart, clôture de findings |
| Administrateur d'organisation | `org_admin` / `owner` | Gestion des workspaces, membres, méthodologie |
| Lecteur | `viewer` | Consultation |
| Prestataire (externe) | — (lien tokenisé) | Répondre au questionnaire sans compte |

### 6.3 Parties prenantes du projet

- **Commanditaire / jury** : RNCP39583 (évaluation du diplôme).
- **Client type** : entité financière UE soumise à DORA.
- **Régulateurs cités** : EBA/ESA, ECB, BaFin, AMF, DNB, CSSF.
- **Contexte organisationnel** : ktayl-solution IS (le SI sur lequel Retrieva tourne).

---

## 7. Besoins fonctionnels

Exigences numérotées, regroupées par domaine. Priorité **MVP** / **V1** / **V2**.

### 7.1 Graphe d'arrangements & Registre

| ID | Exigence | Priorité |
|---|---|---|
| FR-01 | Modéliser l'**arrangement TIC** comme objet central (fait), avec dimensions Prestataire / Entité légale / Fonction métier / Classe de données | MVP |
| FR-02 | Représenter la chaîne de **sous-traitance (nth-party)** entre prestataires | MVP |
| FR-03 | Classer une fonction métier en **critique/importante (CIF)** | MVP |
| FR-04 | **Projeter le Registre RT.02.01** (B_01…B_05) à la demande depuis le graphe, sans double saisie | MVP |
| FR-05 | **Exporter** le Registre en XLSX/CSV au format gabarit EBA versionné | MVP |
| FR-06 | Signaler tout champ requis manquant comme **« gap »**, jamais une cellule vide silencieuse | MVP |
| FR-07 | Schéma **« group-ready »** (entité légale auto-référente, arrangements intra-groupe représentables) | MVP (schéma) |

### 7.2 Preuves & piste d'audit

| ID | Exigence | Priorité |
|---|---|---|
| FR-08 | **Preuve à deux niveaux** : *provider-global* (ISO 27001, SOC 2, BCP — mutualisée) vs *arrangement-local* (contrat, usage, sortie) | MVP |
| FR-09 | Chaque preuve porte `document · version · source · date · prestataire · service · validité · hash (sha256)` | MVP |
| FR-10 | **Piste d'audit immuable** (append-only, garantie par trigger BDD) : qui a décidé, sur quelle preuve, quand | MVP |

### 7.3 Bibliothèque de contrôles & moteur d'évaluation

| ID | Exigence | Priorité |
|---|---|---|
| FR-11 | **Bibliothèque de contrôles versionnée** (DORA article → contrôle → preuve attendue → motifs de clause → applicabilité CIF), données inspectables (JSON), pas de prompt | MVP |
| FR-12 | Applicabilité **proportionnée** : contrôles de base pour tout arrangement, contrôles `cif_mandatory/enhanced` seulement si fonction critique/importante | MVP |
| FR-13 | Moteur produisant un **verdict cité et ancré sur la preuve**, estampillé `libraryVersion` (reproductibilité) | MVP |
| FR-14 | Analyse d'écart article par article d'un document TIC (RAG : multi-query + HyDE + re-rank cross-encoder + citations) | MVP (livré) |
| FR-15 | Scoring **déterministe** et visible (score inhérent + efficacité contrôles + plancher résiduel 15 %) | V1 |

### 7.4 Cycle de vie & déclencheurs

| ID | Exigence | Priorité |
|---|---|---|
| FR-16 | Machine à états : Prospect → Due diligence → Actif (Registre) → En revue → Remédiation → Sortie | V1 |
| FR-17 | Déclencheur 🟡 **prestataire existant** → plan d'écart + remédiation | MVP |
| FR-18 | Déclencheur 🟢 **nouveau prestataire** → due diligence + approbation | V1 |
| FR-19 | Déclencheur 🔴 **changement** → analyse d'impact par traversée de graphe (matérialité = f(type de changement, atteignabilité d'une CIF, classes de données)) | V1 |
| FR-20 | **Sortie** (Art. 28(8)) + réévaluation **périodique** (CIF) + revue liée à incident | V1 |

### 7.5 Clauses contractuelles (Art. 30)

| ID | Exigence | Priorité |
|---|---|---|
| FR-21 | Scoring individuel des **12 clauses** `Art.30(2)(a)–(h)` + `30(3)(a)–(d)` avec `accept/reject/waive` | V1 |
| FR-22 | Compteur de **tours de négociation** liant les brouillons d'un même prestataire | V1 |
| FR-23 | Signature avec traçabilité (qui, quand, note) — restituable en un clic à l'auditeur | V1 |

### 7.6 Questionnaires & surveillance

| ID | Exigence | Priorité |
|---|---|---|
| FR-24 | Questionnaires fournisseurs via **liens tokenisés** `/q/<token>` sans création de compte, score auto-réinjecté | MVP (livré) |
| FR-25 | **Surveillance 24 h** des certifications (ISO 27001/SOC 2/CSA-STAR/ISO 22301), dates de contrat, prochaines revues → alertes (90/30/7 j) | MVP (livré, voir risque §14) |
| FR-26 | **Digest** hebdomadaire des findings (résumé IA) + alertes de concentration | V1 |

### 7.7 Décisions, findings, garde-fous IA

| ID | Exigence | Priorité |
|---|---|---|
| FR-27 | Décision formelle `proceed/conditional/reject` avec motif, auteur, horodatage — conservée | V1 |
| FR-28 | Verdict en **énum** : Conforme / Partiel / Non-conforme / **Preuve insuffisante** / N/A | MVP |
| FR-29 | **Absence de preuve → « preuve insuffisante, revue humaine »**, jamais « non-conforme » automatique (branche déterministe avant tout appel modèle) | MVP |
| FR-30 | Reporting en **« couverture »**, jamais en « % conforme » | MVP |
| FR-31 | **Humain dans la boucle** obligatoire sur toute décision à responsabilité réglementaire (voir principe n°3) | MVP |
| FR-32 | **Pré-remplissage IA** proposé (profil prestataire, liste sous-traitants, brouillon de décision, plan de sortie) — l'humain valide | V1 |

### 7.8 Multi-tenant, sécurité, i18n, intégrations

| ID | Exigence | Priorité |
|---|---|---|
| FR-33 | Multi-tenant Organisation → Workspace → membres, RBAC (`owner/admin/analyst/viewer`) + rôles métier + **séparation des tâches (SoD)** | MVP |
| FR-34 | Isolation des données au niveau requête (`entityScopeCondition`) sous `ENTITY_ISOLATION_MODE=enforce` | MVP (livré) |
| FR-35 | Authentification **JWT** propre (access + refresh, rotation), MFA | MVP (livré) |
| FR-36 | Interface **bilingue EN/FR** de bout en bout | V1 |
| FR-37 | **API publique + sous-système de webhooks** : chaque signal externe → objet Retrieva de 1re classe → `Finding` déclenché | V2 |
| FR-38 | **Commandes en langage naturel** pour power users | V2 |

---

## 8. Besoins non-fonctionnels (NFR)

Registre dérivé de l'[architecture de solution](../architecture/solution-architecture.md).

| ID | NFR | Cible | Mesure / mise en œuvre |
|---|---|---|---|
| NFR-01 | **Disponibilité** | prod backend+frontend ≥ 2 réplicas ; PDB | ArgoCD selfHeal ; HA datastore = suite RTV-45 |
| NFR-02 | **Latence** | RAG p95 raisonnable (Q&A interactif) | timings Langfuse ; réponses en streaming (timeout ingress 300 s) |
| NFR-03 | **Capacité / scalabilité** | tient le quota ns `retrieva` (req 1 CPU/2Gi, limit 6 CPU/6Gi, 16 pods) | ResourceQuota GitOps |
| NFR-04 | **Durabilité / RPO** | données app + vecteurs sur Longhorn ; backups plateforme | Longhorn PVC + Velero/MinIO |
| NFR-05 | **Sécurité** | JWT, RBAC + isolation tenant, PII in-cluster/UE, secrets en Vault | modèle de menace §9 + docs sécurité |
| NFR-06 | **Gouvernance IA** | génération/embeddings via passerelle LiteLLM uniquement, résidence UE, vision cost-gated | NetworkPolicy egress default-deny |
| NFR-07 | **Observabilité** | traces app + métriques RED + coût | Langfuse (projet dédié) + Prometheus/Grafana |
| NFR-08 | **Conformité** | intégrité du Registre DORA ; résidence RGPD ; accessibilité **RGAA** | audit RGAA **96/100** (voir [BC02](./bc02-accessibility-audit.md)) |
| NFR-09 | **Reproductibilité** | tout verdict estampillé version de bibliothèque de contrôles | `libraryVersion` sur chaque finding |
| NFR-10 | **Image env-agnostique** | même artefact dev/prod, config au runtime | URL API injectée au runtime |

---

## 9. Contraintes

### 9.1 Contraintes réglementaires
- Conformité au règlement **(UE) 2022/2554 (DORA)**, articles 28–30, et au gabarit **EBA RT.02.01**.
- **RGPD** : résidence UE des données, PII maintenue dans le cluster, masquage (Presidio) à la
  passerelle.
- **EU AI Act** : support à la décision + supervision humaine (satisfait par les garde-fous §7.7).
- **RGAA** : accessibilité (audit 96/100 obtenu).

### 9.2 Contraintes techniques
- **Déploiement** sur k3s auto-hébergé (ktayl-solution IS), 2 environnements (dev `retrieva-dev` /
  prod `retrieva`), même image.
- Chaîne **GitOps** : CI (build+preuve, Harbor dev + ghcr prod SHA, cosign + SBOM) → **Kargo** (git
  Warehouse : backend+frontend épinglés sur un même commit SHA) → PR **CODEOWNERS-gated** → **ArgoCD**.
- Secrets via **ESO → Vault**, jamais dans l'image.
- **IA** : génération via passerelle LiteLLM (défaut Ollama Cloud, rotation 3 clés, fallback OpenAI/
  Anthropic/Groq) ; embeddings **`bge-m3`** (1024-dim) auto-hébergés ; vecteurs **Qdrant** (collection
  par tenant).

### 9.3 Contraintes de sécurité
- Trust boundary : Retrieva n'appelle **que** LiteLLM + Qdrant + ses datastores + Langfuse + MinIO —
  imposé par NetworkPolicy egress **default-deny**.
- Modèle de menace **STRIDE-lite** → mitigations (voir §suivant).

### 9.4 Modèle de menace (STRIDE-lite)

| Menace | Vecteur | Mitigation |
|---|---|---|
| Spoofing | token volé / auth faible | JWT access+refresh, rotation, tokens courts |
| Tampering | accès inter-tenant | requêtes tenant-scoped + collection Qdrant par tenant |
| Repudiation | pas de piste d'audit | audit applicatif + trace Langfuse par requête |
| Information disclosure | PII → LLM externe ; fuite de secret | egress default-deny → LiteLLM UE ; masquage Presidio ; secrets ESO→Vault |
| DoS | ingestion / dépense LLM non bornées | limites ingress + vision cost-gated + alerte de dépense |
| Elevation of privilege | contournement RBAC | RBAC hiérarchique + rôles métier + SoD |
| Prompt injection | document/requête malveillant | garde-fous LLM + gate red-team à la passerelle |

### 9.5 Contraintes budgétaires et de délai
- Projet **solo**, budget marginal ≈ **0 €** (matériel CAPEX sunk, IA auto-hébergée) — voir §11.
- Jalon de certification : **MVP démontrable avant la soutenance** (voir §12).

---

## 10. Architecture cible (synthèse)

> Référence complète : [Architecture de solution](../architecture/solution-architecture.md).

```
Prestataire + documents (SOC2 / ISO / DPA / SLA — y.c. PDF scannés & graphiques via Docling + VLM)
    → fileIngestion → RAG (Qdrant, base de connaissance DORA)
    → gapAnalysisAgent + questionnaireScorer  →  mapping contrôles DORA Art 28/29/30
    → concentrationService (graphe nth-party · SPOF · substrat partagé)   ← le moat
    → scoring du risque   →   VALIDATION HUMAINE   →   reportGenerator + registre RT.02.01
    → alertMonitorService (surveillance continue / réévaluation sur changement)
```

| Couche | Technologie |
|---|---|
| Backend | Express 5 / Node.js 20+ |
| Frontend | Next.js 16 / React 19 / TypeScript / shadcn/ui / Tailwind |
| Orchestration IA | LangChain (LCEL) |
| LLM | LiteLLM → Ollama Cloud (défaut) / OpenAI / Anthropic / Groq |
| Embeddings | Ollama `bge-m3:latest` auto-hébergé |
| Vecteurs | Qdrant (par tenant) |
| Base de données | MongoDB → **PostgreSQL + Drizzle** (migration RTV-45, requête de concentration en CTE récursive typée) |
| Cache / files | Redis / Valkey + BullMQ |
| Temps réel | Socket.io |
| Observabilité | Langfuse + Prometheus/Grafana |

**Journal des décisions d'architecture (ADR)** : le graphe EST le Registre · Mongo → Postgres+Drizzle ·
RBAC hiérarchique + SoD · modèles LLM tiered via LiteLLM (UE/gouverné) · chunking sémantique ·
ingestion multimodale cost-gated · prompts gérés via Langfuse · JWT propre (workforce plateforme =
Authentik). (Détails et statuts dans l'[architecture de solution](../architecture/solution-architecture.md) §7.)

---

## 11. Modèle économique et budget prévisionnel

> Référence complète : [Unit economics & budget](../strategy/unit-economics.md) · [Maturité & pricing](../strategy/product-maturity.md).

### 11.1 Modèle
**B2B SaaS — conformité réglementée — open-core avec tier entreprise self-host.** Vente à des
entités financières UE sur un problème **légalement obligatoire**. Profil **high-ACV / low-volume /
long-cycle**, abonnement annuel **par entité légale**, tiers par nombre d'arrangements/entités et
couverture des fonctions critiques.

### 11.2 Grille de prix (indicative)

| Tier | Cible |
|---|---|
| Pilote payant (PoV) | 5 k€–15 k€ pour 1–3 mois sur les vrais prestataires du client |
| Mid-market | ~12 k€–30 k€ / entité / an |
| Entreprise / groupe (multi-entités + self-host) | 60 k€–150 k€+ / an |

### 11.3 Deux lentilles de coût

| Lentille | Coût réel |
|---|---|
| **Portfolio / certification (réel)** | ≈ **0 € marginal** — matériel CAPEX sunk, IA auto-hébergée (électricité), équipe de un |
| **SaaS commercial (hypothétique)** | voir ci-dessous |

### 11.4 Unit economics (SaaS commercial)
- **Coût de service par client** : ≈ 50–150 €/mois (infra + IA).
- **Marge brute** : 70–85 % selon le plan.
- **Base fixe** (incompressible pour vendre à des entités financières) : ≈ 0,5–1,0 M€/an —
  dominée par **conformité** (SOC 2 Type II, ISO 27001, pen-tests, DPO, cyber-assurance, juridique :
  100–200 k€) et **équipe** (2–3 ingénieurs + support + vente : 300–500 k€).
- **Seuil de rentabilité** : ≈ **100–210 clients payants** (ARPU mixte ~500 €/mois, contribution
  ~400 €/mois).

> Claim honnête : *unit-profitable dès le client #1, structurellement rentable à ~100–200 clients.*
> Garde-fou coût : l'IA sur providers payants en usage intensif est la seule ligne qui peut déraper →
> fair-use + limiteur + instrumentation LiteLLM, metering seulement si nécessaire (décision #628).

---

## 12. Planning et feuille de route

### 12.1 Position actuelle (évaluation honnête)

| Étape du cycle de vie | Statut Retrieva |
|---|---|
| Idée / Discovery | **Fait** — problème validé par le régulateur (atout le plus fort) |
| PoC | **Substantiellement fait** — RAG + ingestion multimodale + LLMOps |
| Prototype | **Partiel** — landing/brand + chat UI ; workflows DORA pas encore prototypés en UX |
| **MVP** | **Non atteint** — moteur « assess-an-arrangement » en cours (RTV-28→50) |

> **Décalage à corriger (honnête) :** l'infrastructure est à maturité ~stage-8 (GitOps/Kargo/
> observabilité prod-grade, live sur `retrieva.online`) mais **le cœur produit est pré-MVP** — piège
> classique du profil « fort en plateforme ». Le backlog RTV est la route vers le MVP et est
> correctement séquencé ; la priorité est de construire le cœur de domaine.

### 12.2 Échelle de maturité → backlog

| Palier | Périmètre | Stories RTV |
|---|---|---|
| **MVP** | Fondation Postgres+Drizzle → graphe + preuves + Registre → bibliothèque de contrôles → moteur (cité, approuvé humain). **1 seul déclencheur (🟡)** | RTV-45→48, 36–43 |
| **MLP** | Refonte UI + graphe de concentration comme « wow » | RTV-50 → 28 |
| **V1.0 GA** | Cycle de vie complet (🟢+🔴), module type-prestataire, billing/support/docs | RTV-31, 32, 33 |
| **V2.0 / Entreprise** | Gouvernance de groupe (multi-entités), self-host | RTV-35, RTV-44 |

### 12.3 Jalons 12 mois (priorités)
1. **Migration Mongo → Postgres+Drizzle** (RTV-45) — fondation du graphe.
2. **Graphe d'arrangements + projection du Registre** (RTV-36→38) — *livrés*.
3. **Bibliothèque de contrôles + moteur d'évaluation** (RTV-39→43) — *partiellement livrés*.
4. **Refonte authz (RBAC hiérarchique + SoD)** (RTV-51→56).
5. **Chart GAP wrapper + Kargo git-Warehouse** (RTV-57).
6. **Durcissement : fiabilité des workers, email prod, HA datastore.**

---

## 13. Livrables et critères d'acceptation

### 13.1 Livrables projet
- Application Retrieva (frontend Next.js + backend Express) déployée (dev + prod).
- Schéma de données (graphe d'arrangements) + migrations Drizzle.
- Bibliothèque de contrôles versionnée (JSON).
- Export Registre RT.02.01 (XLSX/CSV).
- Documentation Docusaurus (ce site) : vision, architecture, sécurité, API (OpenAPI), certification.

### 13.2 Livrables de certification (RNCP39583)

| Bloc | Artefact | Statut |
|---|---|---|
| BC01 | **Cahier des charges fonctionnel** (ce document) | ✅ (v1.0) |
| BC01 | Budget prévisionnel IS | ⬜ à produire (briques dans [unit economics](../strategy/unit-economics.md)) |
| BC02 | Audit accessibilité / RGAA | ✅ 96/100 |
| BC02 | Cahier de recettes | ⬜ à produire |
| BC02 | Manuel utilisateur / de déploiement | ⬜ à produire |
| BC03 | Dossier déploiement & sécurité | ⬜ à rédiger (RTV-03…09 construits) |
| BC04 | Fiche de consignation d'anomalie | ⬜ à produire |

### 13.3 Critères d'acceptation du MVP
Le MVP est accepté quand **un responsable conformité peut évaluer un arrangement existant et faire
confiance à la sortie** : graphe peuplé (saisie manuelle acceptée) → moteur produit un verdict
**cité, estampillé version, avec piste d'audit** → Registre RT.02.01 exporté sans double saisie →
tous les garde-fous §7.7 vérifiables en code (modules purs testables sans LLM live).

---

## 14. Risques et mesures

| Risque | Gravité | Mesure |
|---|---|---|
| **Email DOWN en prod** (`emailConfigured:false`, pas de `RESEND_API_KEY`) → toute la moitié notification/digest no-op silencieusement | 🔴 | Configurer la clé Resend ; tracké #475 |
| **Le moat est aujourd'hui un plan, pas du code** — le live actuel (RAG chat + ingestion) est proche d'un wrapper | 🔴 | Discipline de la **ligne de coupe MVP** : construire graphe + bibliothèque de contrôles + system-of-record |
| **Fragilité des workers** (ingestion/embedding async) — la promesse « continue » en dépend | 🟠 | Durcissement #437–440, #433 |
| **Absorption par un incumbent** (OneTrust, ServiceNow, Archer, Big 4) | 🟠 | Profondeur + focus ICT-TPRM (graphe nth-party + moteur de changement), pas de dérive généraliste |
| **Commoditisation** (outil ESA gratuit / checkbox cloud) | 🟠 | Être la plateforme **opérationnelle** (surveillance continue, impact de changement), pas l'outil de dépôt ponctuel |
| **HA datastore absente** (Mongo/Redis singletons RWO) | 🟡 | Accepté au MVP ; revisité avec RTV-45 |
| **Épics stratégiques #385–#393 = buckets, pas des stories** | 🟡 | À décomposer sous peine de blocage |

---

## 15. Gouvernance du projet

> Conforme au standard de gouvernance plateforme (15 rôles, 6 phases, matrice RACI). Pour un projet
> de certification, cette section est **la section 15 du CdCF** attendue.

### 15.1 Rôles actifs et affectation

Projet **solo** : le fondateur (AndreLiar) porte la majorité des rôles, assisté par l'IA
(pré-remplissage, revue). Les rôles sont néanmoins explicités pour montrer la couverture SDLC.

| Code | Rôle | Qui le remplit | Actif ? |
|---|---|---|---|
| STK | Stakeholder / Client | Jury RNCP + client type (entité financière UE) | ✅ (externe) |
| PM | Product Manager | AndreLiar | ✅ |
| BA | Business Analyst | AndreLiar | ✅ |
| UX/UI | UX/UI Designer | AndreLiar (+ assistance IA) | ✅ |
| SA | Solution Architect | AndreLiar | ✅ |
| TL | Tech Lead | AndreLiar | ✅ |
| FE | Frontend Developer | AndreLiar | ✅ |
| BE | Backend Developer | AndreLiar | ✅ |
| DBA | Database Engineer | AndreLiar | ✅ |
| DO | DevOps / Platform Engineer | AndreLiar | ✅ |
| QA | QA Engineer | AndreLiar (QA gate adversarial) | ✅ |
| SEC | Security Engineer | AndreLiar | ✅ |
| SRE | Site Reliability Engineer | AndreLiar | ✅ |
| SUP | Support / Helpdesk | — | ⬜ hors périmètre (pas de clients en prod) |

### 15.2 Rôles hors périmètre (justifiés)
- **SUP (Support/Helpdesk)** : aucun client en production → pas de fonction support formelle. Sera
  activé à l'arrivée des premiers pilotes payants.
- **Un co-fondateur commercial (vente/marketing)** : **manquant et reconnu comme tel** — c'est la
  faiblesse structurelle n°1 pour la trajectoire commerciale (cf. §5.4). Hors périmètre du projet de
  certification, critique pour la trajectoire startup.

### 15.3 Matrice RACI (rôles × phases de livraison)

R = Responsible · A = Accountable · C = Consulted · I = Informed

| Rôle \ Phase | P1 Cadrage | P2 Archi/Design | P3 Dév | P4 Infra/CI-CD | P5 Test/Sécu | P6 Release/Ops |
|---|---|---|---|---|---|---|
| STK (jury/client) | A | C | I | I | C | I |
| PM | R | C | C | I | C | C |
| BA | R | C | C | — | C | I |
| UX/UI | C | R | C | — | C | I |
| SA | C | **A/R** | C | C | C | C |
| TL | C | R | **A/R** | C | C | C |
| FE | I | C | R | C | C | I |
| BE | I | C | R | C | C | I |
| DBA | I | C | R | C | C | I |
| DO | I | C | C | **A/R** | C | R |
| QA | I | C | C | C | **A/R** | C |
| SEC | C | C | C | C | **A/R** | C |
| SRE | I | I | I | C | C | **A/R** |
| SUP | — | — | — | — | — | I |

> Lecture : en projet solo, le fondateur **cumule** R et A ; la matrice décrit **quelle casquette**
> est responsable à chaque phase — c'est l'intérêt pédagogique (montrer la couverture complète du
> SDLC, de P1 à P6) pour l'évaluation BC01.

---

## 16. Annexes

### 16.1 Glossaire

| Terme | Définition |
|---|---|
| **DORA** | Digital Operational Resilience Act — règlement (UE) 2022/2554 |
| **ICT-TPRM** | ICT Third-Party Risk Management (gestion du risque lié aux tiers TIC) |
| **RoI / RT.02.01** | Register of Information — Registre d'information DORA |
| **CIF** | Critical/Important Function — fonction critique ou importante |
| **Arrangement** | Arrangement contractuel soutenant une fonction (objet central du domaine) |
| **nth-party** | Sous-traitant de prestataire (4e partie et au-delà) |
| **SoD** | Separation of Duties — séparation des tâches |
| **RAG** | Retrieval-Augmented Generation |
| **PoV** | Proof of Value — pilote payant |
| **ESA / EBA** | European Supervisory Authorities / European Banking Authority |

### 16.2 Mapping RNCP39583

| Bloc | Nom | Où dans ce CdCF |
|---|---|---|
| **BC01** | Piloter | tout ce document (cadrage §1–6, budget §11, planning §12, gouvernance §15) |
| **BC02** | Concevoir & développer | besoins fonctionnels §7, architecture §10 |
| **BC03** | Déployer & sécuriser | contraintes techniques/sécurité §9, modèle de menace §9.4 |
| **BC04** | Optimiser & faire évoluer | maturité & roadmap §12, risques §14 |

### 16.3 Références
- Vision produit, modèle de domaine DORA ICT-TPRM, architecture de solution, maturité & pricing,
  unit economics, défensibilité & moat (docs compagnons, liens en en-tête).
- Suivi : GitHub **Project #2 — « Retrieva — RNCP39583 Certification »**.
