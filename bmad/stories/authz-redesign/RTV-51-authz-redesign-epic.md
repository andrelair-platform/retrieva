---
id: RTV-51-authz-redesign-epic
title: "EPIC: Authorization redesign — hierarchical RBAC + domain roles + Separation of Duties"
status: Ready
type: Epic
epic: authz-redesign
milestone: "RTV — Authorization redesign"
estimate: 21
labels: [epic, retrieva, cert, security, backend, domain-logic]
priority: P1
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Epic

As the **compliance owner**, I want one coherent authorization model — hierarchical roles scoped to the domain (Group → Legal Entity), a central capability layer, and enforced Separation of Duties — so that access control matches DORA governance, "who can approve a finding?" is answerable from one place, and the human-in-the-loop model is actually enforceable.

## Why

Today there are **three disjoint role systems** (`User.role` `[user,admin]`; `OrganizationMember` `[org_admin,analyst,viewer]`; `WorkspaceMember` `[owner,member,viewer]`) across two competing scopes, with scattered enforcement and no Separation of Duties — the code even carries an `// audit gap B3` note, and #347/#349 flag the holes. Generic SaaS roles can't express DORA governance (risk officer, DPO, legal, auditor, business owner) or SoD (approver ≠ analyst). See ADR `docs/architecture/authorization-model.md`.

## Scope (epic-level)

- [ ] Scope hierarchy = domain hierarchy (Group / Legal Entity); Org+Workspace collapsed.
- [ ] Full governance role set (platform/group/entity + external `vendor_contact`).
- [ ] Central capability/policy layer (single `can(user, action, resource)`), roles→capabilities as versioned config.
- [ ] Separation of Duties: maker ≠ checker on approvals; sensitive actions role-gated + audit-logged.
- [ ] Least privilege + entity isolation at the query layer (default-deny; group read-across).
- [ ] `role_assignments` on Postgres+Drizzle; both membership tables removed.
- [ ] Roles app-managed in v1; OIDC-group→role mapping seam documented (deferred).

## Breaks down into
RTV-52 (schema/scopes) · RTV-53 (role set + capability module) · RTV-54 (isolation) · RTV-55 (SoD — closes #347) · RTV-56 (vendor_contact).

## Dependencies
- Depends on: RTV-45 / RTV-48 (Postgres + Drizzle + schema).
- Enables: RTV-43 (SoD approval gate), RTV-35 (group/hierarchical authz).
- Supersedes: #347, #349.
