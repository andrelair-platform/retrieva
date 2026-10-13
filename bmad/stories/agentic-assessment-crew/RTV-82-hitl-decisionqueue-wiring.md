---
id: RTV-82-hitl-decisionqueue-wiring
title: "Human-in-the-loop: interrupt() ⇄ decisionQueue ⇄ socket.io 'waiting on you' + ownership-scoped resume"
status: Ready
type: Story
epic: agentic-assessment
estimate: 5
labels: [retrieva, cert, backend, security, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As a **compliance owner**, I want each supervisor **`interrupt()`** to surface as a **`decisionQueue`**
item I can **approve / edit / reject** live, and resuming the run to continue **from the checkpoint** —
so I stay accountable for every verdict (maker/checker SoD) and nothing partial becomes authoritative
without me.

## Context / constraints

- Builds on the **existing** `decisionQueue` module (`decisionQueue.controller.ts` / `.routes.ts`) —
  extend, don't rebuild. Reuse **socket.io** for live "waiting on you" push.
- Gates (from the SDD graph): confirm arrangement · confirm nth-party edges · **approve findings
  (maker/checker)** · final sign-off. (RTV-78 ships the first; this wires the full set + resume.)
- **SoD (RTV-55):** the approver cannot be the maker; the resume is **authenticated + ownership-scoped**.

## Acceptance

- [ ] Each `interrupt()` creates a `decision_queue_item` (`run_id, gate, decision=pending`) + emits a
      socket.io event; `assessment_run.status=waiting_human`.
- [ ] `POST /runs/:id/resume` — authenticated, ownership-scoped, SoD-enforced; body = approve/edit/reject;
      **approve** resumes from the checkpoint, **edit** resumes with the human-corrected payload, **reject**
      halts `blocked`. 422 on bad body, 403 wrong owner/SoD, 404 unknown run.
- [ ] `GET /runs?waitingOnMe=true` powers the "waiting on you" surface; updates pushed live.
- [ ] **Authoritative-write-after-gate** proven: findings stay `draft` / edges `confirmed:false` until an
      approve; a reject writes nothing authoritative.
- [ ] Full audit: `decision_queue_item` + Langfuse trace capture who decided what, when.
- [ ] **L2** integration (interrupt→queue→resume→done) + **L4** smoke on live dev (the full gated run).
- [ ] OpenAPI updated for the new endpoints (`documentation.md` endpoint rule).

## Out of scope

The crew reasoning (RTV-81); net-new UI components beyond reusing the decisionQueue surface.
