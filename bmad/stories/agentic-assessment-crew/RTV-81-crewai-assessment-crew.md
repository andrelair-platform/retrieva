---
id: RTV-81-crewai-assessment-crew
title: "CrewAI assessment crew: clause-mapper → gap-analyst → control-scorer (evidence-grounded, insufficient-evidence default)"
status: Ready
type: Story
epic: agentic-assessment
estimate: 8
labels: [retrieva, cert, ai, domain-logic, python]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva-assessment-crew
project: 2
initiative: Certification
---

## Story

As a **compliance owner**, I want the assessment node backed by a **CrewAI crew that collaborates** —
a **clause-mapper** maps contract clauses to DORA controls, a **gap-analyst** finds what's missing, a
**control-scorer** scores coverage — all **evidence-grounded** and defaulting to **"insufficient
evidence"** rather than guessing, so the hardest sub-task gets a specialist team and the output is
trustworthy enough for a human to approve.

## Context / constraints

- **Built on `crewai[a2a]`** (ADR-AGENT-02): the crew is CrewAI agents exposed via `A2AServerConfig`
  (RTV-80); this story fills the `assess-arrangement` skill body — the three role-agents + their flow.
- Implements the RTV-79 `assess-arrangement` A2A skill inside the RTV-80 service. **This is the only
  place autonomy lives** — bounded to this crew; its output is **proposed**, never authoritative (the
  supervisor's human gate, RTV-82, decides).
- **Evidence-grounded guardrail** (product-wide): no evidence → finding = **"insufficient evidence"**,
  never a fabricated verdict. **Coverage, not a compliance %.** Calibrated confidence.
- Retrieves evidence via tools (Qdrant) using the `evidenceRefs` it is handed; **persists nothing**.
- Control-library **version** flows in the request and is echoed in every finding (auditability).

## Acceptance

- [ ] Three CrewAI role-agents (clause-mapper, gap-analyst, control-scorer) with a defined collaboration
      flow; LLM via LiteLLM; prompts versioned (reuse the clause-mapping/gap-analysis prompt lineage).
- [ ] Returns the RTV-79 response schema: `findings[] + verdicts[] + citations[] + confidence + insufficientEvidence[]`.
- [ ] **Insufficient-evidence default** proven by test: a clause with no retrievable evidence →
      `insufficientEvidence`, not a verdict.
- [ ] Every finding carries **citations** + the **controlLibraryVersion**; confidence is calibrated.
- [ ] **Idempotent** on `runId+node` (RTV-79) — a re-delegation returns the same result.
- [ ] One **Langfuse** span per crew agent, nested under the run trace.
- [ ] **L1** unit (per agent + grounding guard) + the **L3** crew-side contract test (RTV-79) green.
- [ ] Deterministic enough to be **evaluable** by RTV-75 (stable given the same inputs + library version).

## Out of scope

The supervisor routing (RTV-78), the human gates/resume (RTV-82), a 4th "reviewer" agent (deferred, SDD §9).
