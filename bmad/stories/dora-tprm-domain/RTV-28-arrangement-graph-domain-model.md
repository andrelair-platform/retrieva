---
id: RTV-28-arrangement-graph-domain-model
title: "EPIC: Arrangement-centric domain model + graph (the Register projection)"
status: Ready
type: Epic
epic: dora-tprm-domain
estimate: 21
labels: [epic, retrieva, cert, domain-logic, database, architecture]
priority: Must
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Epic

As the **DORA compliance owner**, I want the platform's core data model to be the **ICT Arrangement graph** (not a flat vendor list) so that risk is tracked where DORA actually regulates it — the arrangement supporting a function — and the Register of Information falls out of the graph rather than being a separate spreadsheet.

## Why

DORA regulates the **contractual arrangement supporting a function**, not the vendor: "France/Azure/Claims" ≠ "Belgium/Azure/email" (same provider, different risk). RT.02.01 (the Register) is ~15 *linked* tables — a relational graph. So the graph **is** the Register. Reshapes the placeholder RTV-15 (concentration graph) + RTV-18 (Register) around the right core object.

## Scope / Acceptance (epic-level)

- [ ] `Arrangement` is the fact object; `Provider`, `Legal Entity`, `Business Function`, `Data-class` are dimensions (star schema).
- [ ] Full chain modelled: Group → Legal Entity → Business Function → **ICT Arrangement** → ICT Service → Provider → Subcontractor; with Contract, Evidence, Controls, Assessments, Findings, Risks, Remediations, Changes hanging off the arrangement.
- [ ] **Group-ready schema NOW**: `entity_id` on every arrangement; provider-global vs arrangement-local evidence separated; intra-group arrangement type (RT.02.01 **B_03**) representable — even though v1 runs a single entity.
- [ ] **Register = a projection**: RT.02.01 export generated from the graph, not hand-filled.
- [ ] Immutable **audit trail** (who/what/evidence/when) on every state change.
- [ ] **Domain-model ADR** authored in `retrieva/docs` mapping the model to DORA Art. 28/29/30 + RT.02.01, and to RTV-15/16/17/18.

## Reshapes / spawns
- Reshapes: RTV-15 (concentration graph → arrangement graph), RTV-18 (Register → projection).
- Spawns: schema migration stories, RT.02.01 export story, audit-trail story, ADR.

## Dependencies
- Blocks: RTV-29, RTV-30, RTV-31, RTV-32 (everything reads/writes this graph).
