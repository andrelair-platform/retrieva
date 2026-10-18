---
id: RTV-96-surveillance-graph-attach-alert
title: "Attach surveillance events to the concentration graph + alert"
status: Ready
type: Story
epic: surveillance
milestone: "RTV — AI-native TPRM service"
estimate: 5
labels: [retrieva, cert, ai-native, backend, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-backend
project: 2
initiative: Certification
---

## Story

As an **ICT risk officer**, when a surveillance event lands for a provider, I want it **attached to that
provider's node in the concentration graph and turned into an alert**, so I can instantly see *which
business functions are exposed* by the incident.

## Background

The "so what" half of Pillar 5. Consumes the normalised events from RTV-95, links each to its provider
node in the existing concentration graph (`services/concentrationService`, provider nodes/dependencies),
computes blast radius (which critical/important functions depend on that provider, incl. nth-party), and
raises an alert / decision-inbox finding for material events.

## Acceptance criteria

- A surveillance event for a tracked provider is linked to its concentration-graph node and visible as
  live signal state on the node (latest severity + recency).
- Blast-radius is computed: the affected functions (and downstream nth-party dependents) are listed with
  the event.
- Material events (severity ≥ threshold) raise a monitoring alert / decision-inbox finding; low-severity
  ones annotate silently.
- No autonomous rating change — the event opens a human review, never rewrites a risk score.

## Definition of Done

- L0–L2 tests over the matching + blast-radius logic with a seeded graph fixture.
- The concentration API/response exposes per-node signal state (for the dashboard to render later).
- Docs: severity→action thresholds.

## Out of scope

The dashboard visualisation polish (can follow as a frontend story on `retrieva`); predictive scoring.
