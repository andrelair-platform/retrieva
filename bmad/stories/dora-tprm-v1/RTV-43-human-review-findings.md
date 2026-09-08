---
id: RTV-43-human-review-findings
title: "Human-in-the-loop review → findings/risk + Langfuse tracing"
status: Ready
type: Story
epic: dora-tprm-domain
milestone: "RTV — DORA ICT-TPRM domain model"
estimate: 5
labels: [retrieva, cert, backend, domain-logic, security]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As an **ICT risk officer**, I want to review the engine's cited verdicts and make the risk decision, with everything recorded, so that the human owns the decision (DORA management-body accountability + EU AI-Act oversight) and it's fully auditable.

## Background

Parent epic **RTV-30** (#501). ADR §5: AI analyses/drafts; the human decides. Connects the engine to the finding/risk workflow (reshapes RTV-17).

## Acceptance Criteria

- [ ] AC-1: Engine verdicts become **draft Findings** (status `proposed`); a human with the risk-officer role **accepts/overrides/defers** each — the human action is what creates an authoritative Finding.
- [ ] AC-2: Overriding a verdict requires a reason; the AI draft + the human decision + evidence refs are all written to the immutable `AuditLog` (RTV-37).
- [ ] AC-3: Accepted findings create **Risks** → route into the remediation loop (links RTV-17 #319).
- [ ] AC-4: **RBAC gate**: only `risk_officer`/`legal` roles can sign off (no self-approve of AI output by a non-authorised role).
- [ ] AC-5: The whole review action is trace-linked (which assessment, which control-library version, which prompt version).
- [ ] AC-6: vitest: a proposed finding cannot become authoritative without a human action; override reason enforced; audit entries present.

## Technical Notes

- Reshapes the placeholder RTV-17 (#319, finding & risk-decision workflow) — link it.
- The role model may reuse the existing workspace roles; RBAC hardening tracked separately (#347/#349) — here enforce the sign-off gate.

## Definition of Done
- [ ] ACs met; human-gate provable; RBAC enforced; audit + traces present
- [ ] Parent epic RTV-30 (#501) + RTV-17 (#319) updated

## Dependencies
- Parent: #501 (RTV-30); Depends on RTV-41, RTV-42
- Reshapes: #319 (RTV-17)
