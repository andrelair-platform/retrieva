---
sidebar_position: 9
---

# DORA Assessment Engine — read, judge, decide

**Status:** Live on **dev** (2026-09-29). The reading + verdict + decision pipeline that turns a
provider's documents into cited, human-decided DORA findings. The AI drafts; the human decides
(EU AI Act human-in-the-loop; DORA maker-checker). This page documents the backend engine, the
decision inbox (backend + frontend), estate import, and the two evaluation harnesses.

## What it does

For each arrangement (a financial-entity → provider → ICT-service relationship), the engine resolves
the applicable DORA controls (CIF-keyed, versioned control library), **gathers evidence** for each,
**judges** whether the evidence satisfies the control (grounded, cited), and produces **findings** +
an evidence-derived **coverage** metric. A checker then **decides** each draft finding through a
segregation-of-duties + audit path; approving a gap opens a tracked **risk**. Everything a checker
must decide surfaces in one cross-arrangement **decision inbox**.

```
                 ┌──────────────────────── assessArrangement (assessmentEngine) ─────────────────────────┐
 arrangement ──▶ │ resolveControls → for each control:  gatherEvidence → assessControl(§5) → finding      │
                 │                     │                      │                    │                       │
                 │        evidenceRetriever            (RTV-37 records ∪            verdict judge           │
                 │        gatherEvidence               RTV-34 RAG spans)            (Langfuse-managed)      │
                 │                     │                      │                                            │
                 │              searchArrangementSpans  [rerank.ts — OFF]                                   │
                 │              (Qdrant arrangement_<id>)                                                   │
                 └───────────────────────────────────────────────────────────────────────────────────────┘
 findings + coverage ──▶ decideFinding / decision-inbox (SoD + audit) ──▶ approved gap ⇒ Risk (remediation loop)
```

## Backend

### 1. Evidence retrieval — `services/assessment/evidenceRetriever.ts`
`gatherEvidence(control, arrangement)` merges two sources: **RTV-37 evidence records** (metadata,
`evidenceRepository.resolveForArrangement`) and **real document spans** retrieved from the
arrangement's per-arrangement Qdrant collection `arrangement_<id>` (`searchArrangementSpans`, RTV-34).
The RAG search is fail-safe (`[]` on any error → the engine still assesses, degrading to
insufficient-evidence). The query is `[control.title, …clauseMatchPatterns].join(' ')`.

**Reranker (`services/assessment/rerank.ts`) — built, env-gated `ASSESSMENT_RERANK_ENABLED`, currently OFF.**
An LLM listwise selector (retrieve top-8 → pick the on-topic passages → judge sees top-3), fail-open.
The full-doc A/B (below) showed a **weak free-model LLM reranker is net-negative** on realistic chunk
counts (it drops the relevant chunk), so it is disabled. The reliable path is a **cross-encoder**
reranker (self-hosted `bge-reranker` or paid) — the gateway exposes none today. Kept off, ready.

### 2. Verdict judge — `services/assessment/verdict.ts` + `verdictLlm.ts`
`assessControl(control, gathered, llmJudge)` is the pure **§5 guardrail**: **no evidence →
`insufficient_evidence` deterministically, with no model call**. When evidence is present, an injected
judge grades it among the evidence-grounded verdicts; an unparseable/invalid judge result also falls
back to `insufficient_evidence` (human review — never a fabricated verdict).

The production judge (`makeVerdictJudge`):
- **Langfuse-managed prompt** via `config/promptManager.resolveVerdictJudgePrompt` — Langfuse-first,
  label-routed **dev=`latest` / prod=`production`** (one shared `retrieva` project), Git constant as
  the reconciled fallback. Prompt name `retrieva-verdict-judge` (prod = **v6**). See
  [Prompt Management](./prompt-management.md). Calibrate as a new Langfuse version + relabel — never a
  code edit/redeploy.
- **JSON mode** — OpenAI `response_format: json_object` (`jsonMode` in `config/llmProvider.ts`, mapped
  by LiteLLM to the provider's native JSON mode) + a **bounded retry** (`VERDICT_JUDGE_MAX_ATTEMPTS`)
  for transient empty completions.
- **v6 calibration rule:** absence / off-topic evidence → `insufficient_evidence`, **never
  `non_compliant`** — a false "FAIL" is the worst error for a compliance tool.

### 3. Findings, coverage, risk & the decision path
- **Coverage** (`services/assessment/coverage.ts`) — evidence-derived "control/evidence coverage"
  (never "% compliant"), + a confidence that is coverage-derived, not the model's self-report.
- **Decision (SoD + audit)** — `services/assessment/applyFindingDecision.ts` is the **shared,
  no-bypass** decision path used by both the per-arrangement endpoint (`PATCH …/findings/:id`) and the
  decision-inbox bulk action. Gates: (1) role `finding:approve`; (2) **maker ≠ checker**; (3) an
  **override reason** is required when the decision contradicts the AI verdict (`isVerdictOverride` in
  `services/security/separationOfDuties.ts`). Approving a gap verdict opens a **Risk**
  (`findingRisk.ts` / `riskLifecycle.ts`), idempotent, appended to the immutable audit trail.

### 4. Decision inbox — `modules/decisionQueue/`
- `GET /api/v1/decision-queue` — one **cross-arrangement** queue of draft findings + open risks
  awaiting a decision, **urgency-sorted** (finding urgency = `1 − confidence` so least-confident first;
  risk urgency = severity rank), with provider + business-function context per row. Pure builder in
  `services/decisionQueue/decisionQueue.ts`.
- `POST /api/v1/decision-queue/accept-high-confidence` — bulk-approve the AI's high-confidence
  **agreements** (clean verdicts ≥ threshold) through `applyFindingDecision`. High-confidence **gaps**
  are *not* bulk-accepted (accepting a flagged risk is an override needing an individual reason) — they
  are reported as `requiresIndividualReason`. Self-authored drafts are skipped (maker ≠ checker).

### 5. Estate import — `services/intake/estateImport.ts` (RTV-69)
Bulk CSV/XLSX import: each row → an arrangement via the **same `confirmProposal` path** as AI-assisted
intake (findOrCreate dimensions + nth-party edges). Pure `rowToProposal` (EN/FR column aliases,
list-splitting, criticality/type normalisation, per-row validation) + `importEstate` orchestrator:
**idempotent** on the natural key (legalEntity|businessFunction|provider|ictService) vs existing
arrangements *and* earlier rows in the file; **multi-entity aware** (a `legal entity` column routes each
row to its branch); **dry-run** preview; per-row error report (bad rows skipped, not the whole file).
`POST /api/v1/arrangements/intake/import[?dryRun=true]`, field `estate` (csv/xlsx/xls).

### 6. Evaluation harnesses
- **`scripts/evaluateVerdicts.js`** — synthetic gold set (`tests/fixtures/verdictEval.json`, 23 cases,
  all verdict classes) → accuracy/precision/recall. Runs in-pod on dev (needs a live model);
  `VERDICT_EVAL_PATH` points it at a copied fixture. Result: **1.000** on the calibrated judge.
- **`scripts/evaluateRealDocs.js`** — real public vendor DPAs vs a **human-validated baseline**
  (`tests/fixtures/realDocBenchmark.json`). Ingests via the real Docling pipeline
  (`parseFile → chunkText → indexArrangementText`), retrieves, judges, scores coverage +
  verdict-agreement. This is what proves the trust claim does not rest on the synthetic number.

## Frontend — `retrieva/frontend/src/features/decision-inbox/` (RTV-67)

The visible payoff: one inbox where **the human's job is to decide**.
- `api/decision-inbox.ts` — consumes `GET /decision-queue` + `POST /accept-high-confidence`; reuses the
  per-arrangement finding/risk decision endpoints (`decideFinding` extended to carry the override
  `reason`). Mirrors the backend `isVerdictOverride` to **enforce the override reason client-side** (a
  dispute / gap-acceptance always carries a note → no 400s).
- `components/decision-inbox-page.tsx` — urgency-sorted cards; verdict/severity badges; confidence bar;
  **cited evidence + rationale inline**; keyboard **`j`/`k`** move · **`a`** accept · **`r`** override ·
  **`d`** defer; **"Accept all high-confidence"** bulk action. Route `(dashboard)/decision-inbox`, nav
  item + EN/FR i18n. Decisions flow through the existing SoD + audit path — no bypass.

## Benchmarks — the honest numbers

| Benchmark | Result | Note |
|---|---|---|
| Verdict gold set (synthetic, 23 cases) | **1.000** | calibrated free judge (v6) + JSON mode + retry; over-pass 0 |
| Real docs (3 public DPAs, 4-clause fixture) | 0.500 → 0.583 with rerank | small-sample; rerank looked positive here |
| **Real doc (full AWS DPA, 68 chunks)** | **0.556 no-rerank · 0.444 with rerank** | full-doc ingestion helps; **LLM-rerank HURTS** → disabled |

**Judge-model tiering (measured):** no *fast free* model judges real DORA legalese well (ollama-cloud
0.50 · nvidia-nano-30b 0.54 · chat-reasoning 0.33); the big free model (nvidia-vision-90b, 90B) is
rate-limited into uselessness. → **dev uses a fast free model (accept ~0.5, safe-direction); prod uses
a paid tier.** The dev number is a floor, not the product ceiling.

## Trust properties (why ~0.5 raw is still trustworthy)
- **Over-pass = 0** across every configuration — the judge never grades a should-be-flagged control as
  compliant, and (post-v6) never emits a false `non_compliant`. Errors are **safe-direction**
  (`insufficient`/`partial` → "needs human review"). Correct posture for a human-in-the-loop DORA tool.
- **Every verdict is cited** and grounded only in the provided excerpts; the human decides through
  maker-checker + an immutable audit trail (defensibility / reproducibility, control-library versioned).

## Operate / verify
```bash
# synthetic judge benchmark (in-pod on dev)
kubectl exec -n retrieva-dev <pod> -- bash -lc \
  'cd /app && VERDICT_EVAL_PATH=/tmp/verdictEval.json node --import tsx scripts/evaluateVerdicts.js'
# publish/relabel the judge prompt (Langfuse) — no redeploy
npm run seed:langfuse-prompts           # publish the Git baseline as `latest`
# enable/disable the reranker (dev overlay env) — currently off
ASSESSMENT_RERANK_ENABLED=true|false
```

## Compliance mapping
- **DORA Art. 28/30** — contractual-requirement controls (security, BCP, audit rights, exit,
  sub-processing, data location, incident, authority cooperation…).
- **EU AI Act — human-in-the-loop** — the AI drafts a cited verdict; a human is the accountable decider
  (maker-checker SoD, override-with-reason).
- **Register / audit** — decisions + risk openings are appended to the immutable audit log with the
  control-library + capability-map versions.

## Status honesty (open work)
- **Reranker is OFF** — a weak-model LLM reranker is net-negative on full docs; a **cross-encoder**
  reranker is the reliable lever (issue #618). Full-doc ingestion itself is a modest real win.
- **Judge JSON robustness under queue load** (#619) and **clause-aware chunking** (#618) are filed
  follow-ups. Real-doc agreement on the free dev judge is ~0.55; prod's paid tier is expected higher.

## Delivery (PRs, 2026-09-28→29)
retrieva-backend **#73** (Langfuse-managed judge) · **#74** (fallback reconcile + `VERDICT_EVAL_PATH`) ·
**#75** (JSON mode) · **#77** (judge retry → gold 1.000) · **#76** (RTV-69 estate import) ·
**#78** (decision-queue read side) · **#79** (bulk accept + shared SoD/audit service) ·
**#80** (real-doc benchmark) · **#81** (#617 v6 absence→insufficient) · **#82** (LLM reranker, off).
retrieva **#620** (decision-inbox frontend). gitops **#1455/#1457** (rerank dev enable → disable on
full-doc evidence).
