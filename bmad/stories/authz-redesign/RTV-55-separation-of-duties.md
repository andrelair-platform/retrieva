---
id: RTV-55-separation-of-duties
title: "Separation-of-Duties enforcement (maker≠checker + sensitive-action gates + audit)"
status: Ready
type: Story
epic: authz-redesign
milestone: "RTV — Authorization redesign"
estimate: 5
labels: [retrieva, cert, security, domain-logic]
priority: P1
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As an **ICT risk officer**, I want approvals gated by role AND by maker≠checker, with every sensitive action audit-logged, so that the human-in-the-loop model is genuinely enforceable and defensible to a regulator.

## Background

Parent **RTV-51** (#…); ADR §4. The concrete implementation of RTV-43's "AI drafts, human decides" + the exact gap #347 flagged (RBAC missing on risk-decision + clause-signoff). **Closes #347.**

## Acceptance Criteria

- [ ] AC-1: Sensitive actions are role-gated via `can()` (RTV-53): `finding:approve`/`risk:accept` → `ict_risk_officer`; `clause:signoff` → `legal`; `privacy:signoff` → `dpo`; `register:attest` → risk/compliance.
- [ ] AC-2: **Maker ≠ Checker** enforced at the approve action: the user who authored/last-edited a draft finding **cannot** be its approver (checked against the record's author, not just role).
- [ ] AC-3: Every sensitive action writes actor / action / target / evidence refs / prompt+library version / timestamp to the **immutable audit log** (RTV-37).
- [ ] AC-4: Overriding an AI verdict requires a reason (recorded); the AI draft + human decision are both preserved.
- [ ] AC-5: vitest — maker cannot approve own finding; non-`ict_risk_officer` cannot approve; audit entry written and immutable.

## Technical Notes
- Enforce SoD server-side at the mutation, not just by hiding UI.
- Ties directly into RTV-43 (human review → findings/risk).

## Definition of Done
- [ ] ACs met; maker≠checker proven; audit entries present + immutable; **#347 closed**; parent RTV-51 updated

## Dependencies
- Parent: RTV-51; Depends on RTV-53. Relates: RTV-43, RTV-37. Closes: #347.
