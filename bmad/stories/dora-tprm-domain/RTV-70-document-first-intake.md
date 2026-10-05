---
id: RTV-70-document-first-intake
title: "EPIC: Document-first due-diligence intake (evidence-extract → propose → confirm; questionnaire as fallback)"
status: Ready
type: Epic
epic: dora-tprm-domain
estimate: 13
labels: [epic, retrieva, cert, domain-logic, ai]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Epic

As a **compliance owner**, I want the DORA due-diligence answers **extracted from the evidence we already hold** (SOC 2, ISMS, contract, pen-test report) with the AI **proposing** each answer and me **confirming** it — so that onboarding doesn't stall waiting for a vendor to hand-type a questionnaire, and every answer is backed by a cited document instead of a self-attested claim. The vendor questionnaire is **demoted to a fallback**, auto-scoped to only the questions the documents could not answer.

## Why

Today the questionnaire (RTV-48) is **step 2 of 5** and the *primary* intake: a vendor gets a tokenised link and types ~20–30 answers, then the LLM scores them. This fights two of our own constitutional principles:

- **Clause 1 — "never slow business":** a vendor-fill form is the slowest possible intake. We send a link and then wait days/weeks for someone at the vendor to type.
- **Clause 2 — "AI-first by default":** scoring is AI, but the *input* is manual typing. We automated the cheap half.

It is also the **weakest evidence class** under DORA. A vendor typing *"yes, we have an ISMS"* is worth far less to an auditor than their actual SOC 2 report + the contract clause. Our value story is *"Retrieva IS the graph"* — an **evidence** story — and questionnaire free-text is thin evidence.

The fix is the pattern we already committed to in **RTV-34** (contract-parse → propose → confirm) and **RTV-30** (retrieval → structured-JSON extraction): make **document extraction the primary path**, keep the questionnaire as a **gap-filler**. Same scorer, same schema, same risk-decision UI — we only swap the *source* of each answer from *"vendor typed it"* to *"AI read it from the arrangement's evidence, human confirmed it."* Faster, more automated, and **better** audit evidence (every answer cites a chunk, not a vendor claim). This directly strengthens cert evidence for **BC02** (concevoir — real AI automation) and **BC04** (optimiser — MCO/freshness).

## Scope / Acceptance (epic-level)

- [ ] **Evidence-extract intake:** given an arrangement with ≥1 indexed evidence document, the AI produces a **proposed answer** for each template question by retrieving from that arrangement's Qdrant collection and emitting `{answer, gapLevel, score, reasoning, citations[]}`. Reuses the existing retrieval + the same scoring shape (`questionnaireScorer.scoreQuestion`).
- [ ] **Provenance on every answer:** each question answer records `source: 'ai-extracted' | 'vendor' | 'manual'`, a `confirmed: boolean`, and `citations[]` (evidence doc id + chunk + page). Proposed answers start `confirmed: false`.
- [ ] **Human confirm/override:** the compliance owner reviews proposed answers in the detail view, clicks the citation to see the source chunk, and **confirms** or **edits** each one. Overall score + decision are computed from **confirmed** answers only (unconfirmed shown but excluded, or flagged).
- [ ] **Questionnaire as auto-scoped fallback:** "Send questionnaire" offers to include **only** the questions left `missing` / low-confidence after extraction. A vendor is asked the *residual* questions, never the ones the documents already answered.
- [ ] **No regression:** a pure vendor-fill questionnaire (no documents) still works end-to-end exactly as today — the new path is additive, selected per arrangement.
- [ ] **Audit trail:** extraction run, proposed→confirmed transitions, and citations land in the audit log (`auditLogService`), consistent with RTV-34 provenance.
- [ ] **Arrangement-scoped (RTV-56):** extraction reads only the evidence of the questionnaire's `arrangementId`; the provider-global vs arrangement-local separation (RTV-28) is preserved.

## Suggested slices (become sub-stories)

1. **RTV-70a — backend extraction service + provenance schema** (MVP): `questionnaireExtractor.ts` + `questions[].source/confirmed/citations` fields + a worker path. *This slice alone proves the concept.*
2. **RTV-70b — confirm/override UI:** proposed-answer review + citation drill-down in `questionnaire-detail-page.tsx`; score from confirmed answers.
3. **RTV-70c — questionnaire-as-fallback:** "send only residual questions" flow in `questionnaires-page.tsx` + the send API.
4. **RTV-70d — decision from confirmed evidence:** wire the proceed/conditional/reject panel to the confirmed, cited answers.

## Dependencies

- Depends on: **RTV-14** (ingestion — `fileIngestionService`), **RTV-28** (graph / arrangement-local evidence), **RTV-30** (retrieval→extraction pipeline), **RTV-48** (questionnaire schema + scorer), **RTV-56** (arrangement-scoped questionnaires).
- Relates to: **RTV-34** (same propose→confirm model; contract-parse is a sibling intake path).

---

## Technical design (sketch)

### Principle: one scorer, swappable answer source

The current flow is **vendor types answer → `questionnaireScorer.scoreQuestion(llm, {doraArticle, questionText, answer})` → `{score, gapLevel, reasoning}`**. We keep that function untouched. We add a step **in front of it** that *produces* the `answer` (plus citations) from evidence instead of from a vendor. Extraction and scoring are the same two LLM shapes we already run — we are composing existing parts, not inventing a pipeline.

### New backend service — `services/questionnaireExtractor.ts`

Mirrors `gapAnalysisAgent.ts`'s proven shape (deterministic retrieve → build context → single structured-JSON LLM call). Per template question:

```
proposeAnswerFromEvidence(arrangementId, { id, text, doraArticle, category }):
  1. retrieve   — reuse assessment/evidenceRetriever.ts + arrangementRag.ts to pull the
                  top-k chunks from THIS arrangement's Qdrant collection, query =
                  `${doraArticle} ${text}` (same collection fileIngestionService indexed).
                  Reuse rag/crossEncoderRerank.ts to tighten the top-k (already in the stack).
  2. extract    — one structured-JSON LLM call (createLLM({temperature:0})):
                  "From ONLY these evidence excerpts, draft the vendor's answer to this DORA
                   obligation. If the evidence does not address it, return answer:'' and
                   gapLevel:'missing'. Respond JSON:
                   {answer, gapLevel:'covered|partial|missing', confidence:0-1,
                    citations:[{evidenceId, chunkId, page, quote}]}"
  3. score      — feed the drafted `answer` into the EXISTING questionnaireScorer.scoreQuestion
                  → {score, gapLevel, reasoning}. (Extraction gapLevel is advisory; the scorer
                  remains the single source of the score, so extracted and vendor answers are
                  graded by one rubric.)
  → return { answer, score, gapLevel, reasoning, confidence, citations, source:'ai-extracted',
             confirmed:false }
```

Run all questions with `Promise.allSettled` (same concurrency pattern as `runScoring`). An extracted answer with empty text / low confidence → `gapLevel:'missing'`, `confirmed:false` → becomes a candidate for the fallback questionnaire.

### Schema change — `questions[]` JSONB (no migration, it's JSONB)

`vendor_questionnaires.questions` and `questionnaire_templates.questions` are JSONB, so this is additive — extend each element:

```
{ id, text, doraArticle, category, hint,
  answer, score, gapLevel, reasoning,          // unchanged
  source: 'vendor' | 'ai-extracted' | 'manual',// NEW — default 'vendor' for legacy rows
  confirmed: boolean,                          // NEW — default true for legacy vendor answers
  confidence?: number,                         // NEW — extractor only
  citations?: [{ evidenceId, chunkId, page, quote }] } // NEW — extractor only
```

Legacy read-compat: treat a missing `source` as `'vendor'` and missing `confirmed` as `true` (zod default in `db/schema/zod.ts`) so existing questionnaires behave exactly as today.

### Worker / trigger

Add an `extract` job type alongside `score` in `workers/questionnaireWorker.ts` (BullMQ). A new questionnaire created **with an `arrangementId` that has indexed evidence** auto-queues `extract`; `extract` fills proposed answers and persists `status:'extracted'` (new enum value) — it does **not** send anything. Scoring reuses `runScoring` on confirm. Vendor-fill questionnaires skip `extract` and keep today's `draft→sent→…` lifecycle untouched.

### Scoring from confirmed answers

In `runScoring`, change the "answered" filter from `q.answer && q.answer.trim()` to **`(q.confirmed !== false) && q.answer?.trim()`** so the overall score and decision are computed from confirmed answers only. Unconfirmed proposals are displayed but excluded from the number until the human accepts them. (One-line change; backward-compatible because legacy answers default `confirmed:true`.)

### Fallback questionnaire = residual questions only

When the owner clicks "Send questionnaire" on an extracted questionnaire, the send API filters to questions where `source==='ai-extracted' && (gapLevel==='missing' || confidence<τ) && !confirmed`. The vendor token link (`/q/<token>`) then renders only those residual questions — the vendor is never asked what the documents already answered. Everything else in RTV-56's tokenised portal is unchanged.

### Frontend (`frontend/src/features/questionnaires/`)

- `questionnaire-detail-page.tsx`: each question row gains a **source badge** (`AI-extracted` / `vendor` / `manual`), a **confidence** chip, a **citation** popover (quote + page + link to the evidence doc), and **Confirm / Edit** actions. The existing score/gapLevel/reasoning/decision panels are reused as-is.
- `questionnaires-page.tsx`: new primary CTA **"Extract from evidence"** for arrangement-scoped questionnaires; the existing "Send" becomes the fallback action.

### Files touched (summary)

| Layer | File | Change |
|---|---|---|
| Backend (new) | `services/questionnaireExtractor.ts` | retrieve → extract → score per question |
| Backend (reuse) | `assessment/evidenceRetriever.ts`, `assessment/arrangementRag.ts`, `rag/crossEncoderRerank.ts` | retrieval of arrangement evidence |
| Backend (reuse, unchanged) | `services/questionnaireScorer.ts` | `scoreQuestion` called on extracted + vendor answers alike |
| Backend | `workers/questionnaireWorker.ts` | add `extract` job type |
| Backend | `services/QuestionnaireService.ts` | `extract`, `confirm`, `send-residual` operations; score-from-confirmed |
| Schema | `db/schema/questionnaires.ts` + `zod.ts` + `enums.ts` | additive JSONB fields + `extracted` status |
| Frontend | `features/questionnaires/components/*` + `api/questionnaires.ts` | source/confidence/citation UI + confirm/extract/send-residual calls |
| Audit | `services/auditLogService.ts` | log extraction + confirm transitions |

### What we deliberately keep

- The **questionnaire is not deleted** — it remains the right tool for obligations only the vendor can attest (and the zero-document case).
- The **scorer, decision thresholds (70 / 40), and detail UI** are untouched — this is a source-of-answer change, not a re-architecture.
- **Propose → confirm** (never auto-accept) keeps the human on legal liability (Clause 3), and gives the audit trail its provenance.
