---
id: RTV-56-vendor-contact-access
title: "External vendor_contact access (single-arrangement scope; vendor portal authz)"
status: Ready
type: Story
epic: authz-redesign
milestone: "RTV — Authorization redesign"
estimate: 5
labels: [retrieva, cert, security, backend]
priority: P2
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **provider's representative**, I want a scoped external login that lets me answer a questionnaire and upload evidence for **only my arrangement** so that vendors can self-serve evidence collection without any visibility into the customer's internal data.

## Background

Parent **RTV-51** (#…); ADR §2 (external role). Powers the vendor collection portal (RTV-16) and the AI-provider questionnaire (RTV-33), safely.

## Acceptance Criteria

- [ ] AC-1: `vendor_contact` is an external principal scoped to **one arrangement** (invite/token-based, time-boxed).
- [ ] AC-2: Capabilities strictly limited: `questionnaire:respond` + `evidence:upload` for that arrangement only; **no** read of assessments/findings/other arrangements/entities.
- [ ] AC-3: Isolation test: a vendor_contact cannot enumerate or reach any resource outside its arrangement (403/empty).
- [ ] AC-4: Uploaded evidence lands as **arrangement-scoped** (RTV-37), attributed to the vendor principal in the audit log.
- [ ] AC-5: Revocation/expiry: access ends when the collection closes or the invite is revoked.

## Technical Notes
- Keep vendor auth separate from staff SSO (a distinct, minimal external flow); never a staff role.
- Complements RTV-16 (evidence portal) + RTV-33 (AI-provider module).

## Definition of Done
- [ ] ACs met; single-arrangement isolation proven; expiry/revocation works; parent RTV-51 updated

## Dependencies
- Parent: RTV-51; Depends on RTV-53. Relates: RTV-16, RTV-33.
