---
sidebar_position: 2
---

# Conformité au référentiel de workflow DORA (blueprint → code → statut)

> **But.** Cette page est la **matrice de traçabilité** entre le référentiel de workflow ICT
> third-party (cycle de vie DORA Art. 28–30 + ITS 2024/2956) et l'implémentation réelle de Retrieva.
> Chaque capacité du blueprint est tracée vers le **code qui la réalise** (service/module/table) et un
> **statut** 🟢 fait / 🟡 partiel / 🔴 manquant. Les lacunes portent un **plan de remédiation** chiffré
> (phases P0–P4) pour atteindre 100 %. Preuve pour **BC02 (concevoir & développer)** et
> **BC04 (maintien en condition opérationnelle)**.
>
> Évaluation faite sur le code (49 services, 16 modules, 38 tables, l'orchestrateur multi-agent, le RBAC
> `domain_role`). **Conformité actuelle : ~75–80 %**, structurée autour du **cycle de vie** (pas de
> formulaires isolés).

## 1. Cycle de vie (5 étapes)

| Étape | Dans le code | Statut |
|---|---|---|
| 1. Discover & inventory | `discovery/` (authentik/erpnext/okta/scim/odata/rest), `cmdbAssetRefs`, `estateImport`, `appToProposal` | 🟢 |
| 2. Classify & assess | `assessment/`, `gapAnalysisAgent`, `scoring/unifiedDoraScore`, `CriticalFunction`, `tier/criticality` | 🟢 |
| 3. Evidence & contracts | `fileIngestion`, `visionService`, RAG, `evidence`/`evidenceRequests`, `legal`, `contractExtractionService` | 🟢 |
| 4. Human decision gate | LangGraph supervisor `interrupt()`, `decisionQueue`, `approvalService`, RBAC maker/checker | 🟢 |
| 5. Register & monitor | `registerExport` (RT.01–04), `surveillance`, `alertMonitor`, `periodicReassessment` | 🟢 |

## 2. Workflows primaires A / B / C

### A — Fournisseurs existants — 🟢 quasi complet
`estateImport` (Discover) · `discoveryService`/dedup (Match) · `scoring`+`CriticalFunction` (Classify) ·
`QuestionnaireService`+`evidenceRequests` (Collect) · `gapAnalysisAgent` (Assess) ·
`riskLifecycle`/`applyFindingDecision` (Remediate) · `registerProjection` (Update) · `surveillance` (Monitor).

### B — Nouveau fournisseur avant contrat — 🟡 présent, gate à durcir
`intake/` + `adoptionRequestService` (Intake) · `discoveryService` dedup (Screen) · classify ✅ ·
DDQ+evidence (Due diligence) · `contractExtractionService` (Contract) · `scoring`+decision gate (Risk) ·
`arrangementProposalWorkflow` + lifecycle `prospect→due_diligence→active` (Onboard).
**Écart (P1a) :** l'étape « vérifier les approbations/conditions AVANT activation » existe comme états de
lifecycle (`approve_onboarding {approval:true}`) mais n'est pas un **gate bloquant dur** (pas de
précondition exigeant les sign-offs legal + security + risk réunis).

### C — Monitoring event-driven — 🟢/🟡
Event-driven réel : `cveClient` (vulnérabilités), `statuspageClient` (incidents), event-types
`cve/incident/breach/cascade/blast_radius` + dedup. Scheduled : `periodicReassessment`.
**Écart (P2b) :** les triggers *sous-traitant change* et *data-location change* sont détectables via le
graphe mais pas tous câblés à un flux d'événement entrant.

## 3. Workflows supports D–I

| | Blueprint | Dans le code | Statut |
|---|---|---|---|
| D | Document & evidence intelligence | `fileIngestion`+Docling+`visionService`(VLM)+RAG+two-tier `evidence` | 🟢 |
| E | Contractual compliance | `legal`, `contractExtractionService`, `contractAmendments`, `ddqContradictions` | 🟢 |
| F | Dependency & concentration | `concentrationService`, `providerDependencies`, `substituteProviders` (nth-party) | 🟢 |
| G | Register of Information | **RT.01.01/02.01/03.01/04.01 + B_01.01/02** · `completeness`+`rules`+`reconciliationService` · réf. ITS 2024/2956 | 🟢 |
| H | Termination & exit | `exitStrategy`, `exitArtefacts` (exit_blueprint/provider_match/reintegration_model) | 🟢 |
| I | Compliance monitoring & audit readiness | `auditLog`/`actionAudit` (immutable), `reportabilityService` | 🟡 (dashboards/evidence-packs partiels — P4) |

## 4. Modèle human-in-the-loop (9 parties)

Le RBAC `domain_role` couvre les 9 parties ; les deux manquants (procurement, information security) ont
été ajoutés (voir [Authorization Model](../architecture/authorization-model)).

| Partie blueprint | Rôle code | Statut |
|---|---|---|
| Business owner | `business_owner` | 🟢 |
| Procurement / vendor mgmt | `procurement` | 🟢 |
| ICT risk / DORA team | `ict_risk_officer` | 🟢 |
| Information security / IT | `security_officer` | 🟢 |
| Legal / compliance | `legal` + `group_compliance` | 🟢 |
| Supplier | `vendor_contact` (portail) | 🟢 |
| Risk-acceptance authority | `ict_risk_officer.risk:accept` | 🟡 pas de seuils de délégation (P1b) |
| Senior management | délégué à `ict_risk_officer` (pas d'acteur board — décision documentée) | 🟡 |
| Internal audit | `auditor` (read-only) | 🟢 (indépendance = accepté-risque, projet solo) |

**Contrôle essentiel** (« l'équipe qui opère ≠ celle qui assure ») = **SoD maker/checker** imposé
(`can()` + log immuable).

## 5. Répartition de l'automatisation — alignée

Déterministe (champs obligatoires, deadlines, routing, `completeness/rules`) + IA
(`gapAnalysisAgent`, crew CrewAI, extraction non-structurée) + humain (risk acceptance, criticité, legal)
via les gates. Gap detection explicable + traçabilité source (citations) en place.

## 6. Séquence « What I'd build first » — état

1. Unified inventory + relationship graph → 🟢 (Org→Workspace→CriticalFunction→ProviderDependency)
2. Evidence ingestion + assessment engine → 🟢
3. Human approval + remediation engine → 🟢 (approval ✅ ; remediation ✅ ; email prod **`configured`** — reste la vérif de délivrabilité, P0)
4. Register generation + validation → 🟢 (RT.01–04 + completeness)
5. Continuous monitoring → 🟢/🟡 (event + scheduled)

→ Les **5 fondations** de la séquence enterprise-ready sont construites : un moteur de workflow cohérent.

## 7. Plan de remédiation vers 100 %

Fermer les **6 lacunes actionnables**. La concentration *cross-client* (marché) reste roadmap, hors
périmètre du blueprint (le F = intra-client, déjà 🟢).

| Phase | Lacune | Remédiation (points de touche) | Effort | DORA | Bloc |
|---|---|---|---|---|---|
| **P0** | 🟡 Email prod — **wiring déjà fait** (clé Vault + `email.enabled:true` + env présents ; health `configured`). Reste : **vérifier la délivrabilité** (domaine Resend `retrieva.online` SPF/DKIM + un envoi réel). | S | Art.28(1) | BC03/BC04 |
| **P1a** | 🟡 Gate activation pré-contrat (B-8) | `canActivate(arrangement)` sur `approve_onboarding` : exige legal `clause:signoff` + `security:signoff` + risk décidé + evidence complète ; 409 sinon. (`lifecycle/arrangementLifecycle.ts`) | M | Art.28(4),30 | BC02/BC03 |
| **P1b** | 🟡 Délégation d'autorité graduée | Seuils par criticité (standard→`ict_risk_officer` ; important→+`group_risk` ; critical→co-sign) ; table versionnée. (`config/authz/`, `riskLifecycle.ts`) | M | Art.28(1) | BC01/BC03 |
| **P2a** | 🟡 Routing intelligent des findings | Table `(findingType,criticality)→role` : assigner + notifier le bon rôle. (`modules/decisionQueue/`, `applyFindingDecision.ts`, `emailService`) — dépend de P0. | M | Art.28 | BC02 |
| **P2b** | 🟡 Triggers event-driven manquants | Diff auto à la ré-ingestion (subprocessor/residency) → event → rouvre l'assessment. (`surveillance/classify.ts`, `concentrationService`, `periodicReassessment`) | M | Art.28(1),29 | BC04 |
| **P3** | 🟡 Data-quality registre (116 checks ESA) | Étendre `completeness/rules.ts` vers les familles ESA (intégrité relationnelle, champs obligatoires par RT, validation LEI, cohérence CIF, complétude nth-party) ; chaque règle tracée à l'ITS 2024/2956. | L | Art.28(3)+ITS | BC02/BC04 |
| **P4** | 🟡 Dashboards + evidence-packs audit | Endpoint evidence-pack on-demand + dashboards (overdue/freshness/coverage/deadlines). (`reportability/`, nouveau `auditPack`, frontend) | M-L | Art.28(1) | BC04 |

**Séquence :** P0 (~1-2 j) → P1 (~1 sprint) → P2 (~1 sprint) → P3 (~1-2 sprints) → P4 (~1 sprint) ≈
**4-6 sprints**. Livraison en stories BMAD (repo `retrieva`), tier-A → pyramide L0–L4 + QA gate avant prod.

### Issues de suivi (board #2 — Retrieva RNCP39583)

| Phase | Issue | Repo |
|---|---|---|
| P0 — Email prod | [retrieva-backend#199](https://github.com/andrelair-platform/retrieva-backend/issues/199) | retrieva-backend |
| P1a — Gate activation | [retrieva-backend#200](https://github.com/andrelair-platform/retrieva-backend/issues/200) | retrieva-backend |
| P1b — Délégation d'autorité | [retrieva-backend#201](https://github.com/andrelair-platform/retrieva-backend/issues/201) | retrieva-backend |
| P2 — Routing + triggers event-driven | [retrieva-backend#202](https://github.com/andrelair-platform/retrieva-backend/issues/202) | retrieva-backend |
| P3 — Data-quality 116 checks ESA | [retrieva-backend#203](https://github.com/andrelair-platform/retrieva-backend/issues/203) | retrieva-backend |
| P4 — Evidence-packs + dashboards | [retrieva#723](https://github.com/andrelair-platform/retrieva/issues/723) | retrieva |
