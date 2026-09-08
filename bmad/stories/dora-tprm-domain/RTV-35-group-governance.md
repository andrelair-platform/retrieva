---
id: RTV-35-group-governance
title: "EPIC: Group governance (multi-entity) — DEFERRED, schema-ready only"
status: Draft
type: Epic
epic: dora-tprm-domain
estimate: 34
labels: [epic, retrieva, cert, domain-logic, deferred]
priority: Could
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Epic

As **Group ICT Risk** (headquarters of a multi-entity insurer), I want consolidated governance across legal entities so that HQ can continuously demonstrate its 20 entities manage ICT third-party risk per the Group framework, and see which critical functions depend on which providers/subcontractors group-wide.

## Why (and why DEFERRED)

DORA has a real group dimension: consolidated/sub-consolidated Register at group level, intra-group arrangements (RT.02.01 **B_03**), concentration (Art. 29), lead-overseer/CTPP regime. This is the strongest *enterprise* selling point. BUT the full 4-layer group platform is OneTrust/ServiceNow-scale — building it before a design partner needs it would sink a solo MVP. So: **schema is group-ready NOW (RTV-28); these features are DEFERRED.** A single entity taken fully end-to-end is stronger RNCP evidence + a cleaner demo than a half-built group console.

## Scope (deferred — build when a group design partner is real)

- [ ] **Framework inheritance**: Group control framework (versioned) → entities inherit; entity may ADD local/regulatory overlays but cannot silently weaken a group-mandatory control; inheritance is a live versioned link (updates re-flag inheritors), not a copy.
- [ ] **Hierarchical ABAC + risk-based delegation/escalation**: row-level tenancy (France can't see Belgium's confidential contracts; Group has read-across); configurable approve/review/notify matrix by risk×criticality.
- [ ] **Group consolidation dashboard**: entities reporting, arrangements, critical/important count, high-risk findings, overdue remediation, coverage per entity — labelled **coverage, never "% compliant"** — with HQ drill-down entity→function→arrangement→controls→evidence.
- [ ] **Group concentration + fourth-party roll-up across entities** (the "4 SaaS all behind AWS" discovery) — same graph traversal as RTV-28, surfaced at group scope.
- [ ] **Group change events**: a provider change analysed once at group level, business impact evaluated per entity.

## Dependencies
- Schema prerequisites already in RTV-28 (entity_id, provider-global vs arrangement-local evidence, intra-group arrangement type).
- Status stays **Draft/Deferred** until a multi-entity design partner exists.
