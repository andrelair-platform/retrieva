---
sidebar_position: 12
---

# Authorization Model (ADR)

**Status:** Accepted · **Date:** 2026-09-09 · **Scope:** Retrieva's users, roles & access control
**Supersedes:** the three ad-hoc role systems (`User.role`, `OrganizationMember.role`, `WorkspaceMember.role`)
**Referenced by:** epic RTV-51 (+ RTV-52…56) · **Absorbs:** #347, #349 · **Enables:** RTV-43 (SoD), RTV-35 (group)
**Companion:** [DORA ICT-TPRM Domain Model](./dora-tprm-domain-model.md), [Datastore](./datastore-postgresql.md)

## Context — what exists today (and why it's wrong)

The current backend has **three disjoint role systems** across **two competing scopes**:

| Where | Roles | Scope | Enforcement |
|---|---|---|---|
| `User.role` | `user`, `admin` | global | `authorize('admin')` — code self-flags `// audit gap B3` |
| `OrganizationMember.role` | `org_admin`, `analyst`, `viewer` | organization | ~unused |
| `WorkspaceMember.role` | `owner`, `member`, `viewer` | workspace | hardcoded `role === 'owner'` + ad-hoc `permissions.{canQuery,canViewSources,canInvite}` |

Problems: overlapping vocabularies; Org vs Workspace ambiguity; **roles don't match the domain**
(generic SaaS `owner/member/viewer`, not governance roles); **no Separation of Duties** (can't gate
an approver distinctly from an analyst — the gap #347 flagged); permission checks scattered across
three mechanisms; **not group-ready** (no entity isolation / group read-across for RTV-35).

## Decision

Replace all three with **one hierarchical RBAC model whose scope hierarchy mirrors the domain
hierarchy**, a **central capability/policy layer**, and **enforced Separation of Duties**.

### 1. Scope = the domain hierarchy
Drop the Org/Workspace split. Roles are **assigned at a scope level**: **Group** or **Legal Entity**
(mirroring Group → Legal Entity → Arrangements in the domain model). One user has *many* scoped
role assignments.

### 2. Domain role set (full governance set)
- **Platform:** `platform_admin` — the SaaS operator (not a customer role).
- **Group scope:** `group_admin`, `group_risk` (read-across + escalation), `group_compliance`.
- **Entity scope (working roles):**
  | Role | Purpose | Maker/Checker |
  |---|---|---|
  | `entity_admin` | manage the entity's users/config | — |
  | `analyst` | draft assessments, collect evidence | **maker** |
  | `ict_risk_officer` | sign off findings / risk-acceptance (management-body delegate) | **checker** |
  | `legal` | approve contractual clauses (exit, audit rights, subcontracting) | checker (legal dim.) |
  | `dpo` | approve the data-protection dimension (GDPR/residency) | checker (privacy dim.) |
  | `business_owner` | attest usage/criticality for *their* functions only | attester |
  | `auditor` | **read-only across everything** (internal audit / regulator) | read |
  | `viewer` | limited read-only | read |
- **External:** `vendor_contact` — a provider rep who can **only** answer a questionnaire / upload
  evidence for **their single arrangement**; zero internal visibility (vendor portal, RTV-16/33).

### 3. Central capability layer
One policy module maps `(role, scope) → allowed actions on resource types` — no scattered
`role === …` checks. A single `can(user, action, resource)` answers everything (e.g.
`finding:approve` → `ict_risk_officer`; `assessment:edit` → `analyst`; `register:export` →
risk/compliance; `evidence:upload` → analyst + `vendor_contact`(own)). Roles→capabilities are
**versioned data/config**, inspectable like the control library.

### 4. Separation of Duties (the compliance crux)
- **Maker ≠ Checker:** the user who drafted a finding **cannot** approve it — enforced at the
  *approve action*, not just by role. Concrete implementation of RTV-43's "human decides" + #347.
- Sensitive actions (risk acceptance, clause sign-off, Register attestation) require the specific
  role **and** write actor/action/target/evidence/timestamp to the immutable audit log (RTV-37).

### 5. Least privilege + entity isolation
Default-deny. Every scoped query is filtered by the user's entity assignments at the query layer
(Drizzle); group roles opt into read-across. This is what makes cross-entity confidentiality
(France ⊥ Belgium) and group consolidation (RTV-35) both possible.

### 6. Data shape (Postgres + Drizzle)
- `users` = identity only (drop `user/admin`; keep a real `platform_admin` flag).
- **`role_assignments(user_id, scope_type[group|entity], scope_id, role)`** — replaces both
  membership tables.
- roles→capabilities as versioned config.

### 7. Identity source (v1 vs later)
v1 roles are **app-managed** (assigned in Retrieva). A **seam to map Authentik/OIDC group claims →
Retrieva roles** is documented for enterprise SSO + self-host (RTV-44) — deferred, not v1.

## Compliance mapping
- **DORA:** management-body accountability (risk officer = delegate), SoD, auditor read access, third-party (vendor) limited access.
- **EU AI Act:** the approver is the human-oversight gate on AI output.
- **GDPR:** DPO role + data-scoped access + entity isolation.
- **SOC 2 / ISO 27001:** RBAC, least privilege, SoD, audit trail.

## Backlog realisation (RTV-51)
| Story | Delivers |
|---|---|
| RTV-52 | `role_assignments` schema + collapse Org/Workspace → Group/Entity scopes; migrate memberships |
| RTV-53 | Domain role set + central capability/policy module (single `can()`); replace scattered checks |
| RTV-54 | Least-privilege + entity isolation at the Drizzle query layer (default-deny; group read-across) |
| RTV-55 | Separation-of-Duties enforcement (maker≠checker on approve; sensitive-action gates + audit) — **closes #347** |
| RTV-56 | External `vendor_contact` access (single-arrangement scope; vendor portal authz) |

Depends on RTV-45/48 (Postgres+Drizzle + schema). Sequenced right after RTV-48 so the role model is
in place before the assessment/approval work (RTV-30/41/43). Supersedes #347/#349.

## Consequences
- One coherent, inspectable authz model; "who can approve a finding?" answerable from one place.
- SoD + audit make the human-in-the-loop model (RTV-43) actually enforceable — the compliance story.
- Entity isolation + group read-across unlock RTV-35 without rework.
- Migration cost: replace two membership tables + rewrite three enforcement mechanisms into one — done on the Postgres+Drizzle stack, before the domain engine hardens against the old model.
