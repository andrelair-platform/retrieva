# Retrieva — Authorization redesign (hierarchical RBAC + domain roles + SoD)

**Product / board:** Retrieva — RNCP39583 Certification (Project #2)
**Initiative:** Certification · **Home repo:** `retrieva`
**Reference:** `docs/architecture/authorization-model.md` (the ADR) · **Supersedes:** #347, #349

Replaces the three ad-hoc role systems (`User.role` / `OrganizationMember.role` /
`WorkspaceMember.role`) with **one hierarchical RBAC model** whose scope mirrors the domain
(Group → Legal Entity), a **central capability layer**, enforced **Separation of Duties**, and
**entity isolation**. On Postgres+Drizzle; sequenced after RTV-48 so the role model precedes the
assessment/approval work (RTV-30/41/43) and enables group governance (RTV-35).

| ID | Story | Depends on | Priority |
|---|---|---|---|
| RTV-51 | **EPIC** — AuthZ redesign | RTV-45/48 | P1 |
| RTV-52 | `role_assignments` schema + collapse Org/Workspace → Group/Entity; migrate memberships | RTV-48 | P1 |
| RTV-53 | Domain role set + central capability/policy module (single `can()`) | RTV-52 | P1 |
| RTV-54 | Least-privilege + entity isolation at the Drizzle query layer | RTV-53 | P1 |
| RTV-55 | Separation-of-Duties enforcement (maker≠checker + sensitive-action gates + audit) — **closes #347** | RTV-53 | P1 |
| RTV-56 | External `vendor_contact` access (single-arrangement scope; vendor portal) | RTV-53 | P2 |

Roles are **app-managed** in v1; an OIDC-group→role mapping seam is documented for enterprise
SSO/self-host (deferred). Full governance role set from the start.
