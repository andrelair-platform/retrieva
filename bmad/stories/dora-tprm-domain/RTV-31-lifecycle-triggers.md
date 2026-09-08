---
id: RTV-31-lifecycle-triggers
title: "EPIC: TPRM lifecycle & the three triggers (existing / new / change)"
status: Ready
type: Epic
epic: dora-tprm-domain
estimate: 13
labels: [epic, retrieva, cert, domain-logic]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Epic

As the **compliance owner**, I want one arrangement lifecycle state machine entered by three triggers so that the platform models the DORA ICT-TPRM lifecycle as a single engine, not three parallel apps.

## Why

DORA's text is lifecycle-based: pre-contract due diligence (Art. 28(4)), ongoing monitoring (28(7)), Register maintenance (28(3)), change/subcontracting (30(2)(a)), exit (28(8)). The three "modes" are triggers into ONE state machine — the Register must always reflect current state and an auditor asks for an arrangement's history.

## Scope / Acceptance (epic-level)

- [ ] One state machine: `Prospect → Due diligence → Active (in Register) → Under review → Remediation → Exit`.
- [ ] **🟡 Existing provider** trigger → intake → evidence → gap → remediation (converges to Active).
- [ ] **🟢 New provider** trigger → pre-contract due diligence → approval → onboarding (converges to Active).
- [ ] **🔴 Change** trigger → re-entry into assessment from Active (drives RTV-32).
- [ ] **Exit/termination** trigger (Art. 28(8)) + **periodic re-assessment** trigger (time-based, for CIF arrangements even with no change) + **incident-linked** review.
- [ ] Every terminal decision is **human-approved**; risk-based routing depth set by criticality (CIF).
- [ ] "Modes" are UI journeys over the state machine, not separate data/engines.

## Dependencies
- Depends on: RTV-28, RTV-29, RTV-30.
- Relates to: RTV-16, RTV-17.
