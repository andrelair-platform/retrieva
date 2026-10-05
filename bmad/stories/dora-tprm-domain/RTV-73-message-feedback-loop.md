---
id: RTV-73-message-feedback-loop
title: "Wire chat message feedback end-to-end → Langfuse scores (fix 404, feed the LLMOps/eval loop)"
status: Ready
type: Story
epic: dora-tprm-domain
estimate: 5
labels: [retrieva, cert, backend, ai, domain-logic]
priority: Should
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
initiative: Certification
---

## Story

As a **compliance analyst using the Ask-AI assistant**, I want my 👍/👎 on an answer to actually be recorded, so that (a) the thumbs stop silently failing, and (b) every rating becomes a **Langfuse `user_rating` score** linked to that answer's trace — turning real usage into the feedback dataset that drives the per-product LLMOps eval / improvement loop (the "reinforcement learning from feedback" signal).

## Why — this is a live latent bug AND a missing value stream

From the wiring audit (2026-10-05) + verification:

- **The frontend is fully wired already.** `features/chat/hooks/use-chat-session.ts` has `feedbackMutation` + `handleFeedback('positive'|'negative'|null)`, the message type carries `feedback`, and `conversationsApi.submitFeedback(convId, msgId, {feedback})` POSTs to `/conversations/:id/messages/:id/feedback`.
- **The backend route does not exist.** `routes/conversationRoutes.ts` has only `/`, `/bulk-delete`, `/:id`, `/:id/ask`. So **every thumbs click currently 404s** — users think they're giving feedback; nothing is captured.
- **The `messages` table has no feedback column** (`db/schema/conversations.ts`) and **no trace-id column**, so there's nowhere to persist the rating and no link from a message to its LLM trace.
- **The LLMOps sink already exists and is unused:** `config/tracing.ts:209` `logFeedback(traceId, score, comment)` already pushes `langfuse.score({ traceId, name: 'user_rating', value })` (+ LangSmith `createFeedback`). We just never call it, because no message carries a `traceId`.

So the fix closes a broken feature **and** opens the feedback → Langfuse-score pipeline that the AI-native SDLC eval loop (see `reference_ai_native_sdlc_harness`, `reference_per_product_llmops`) is designed to consume. Strong **BC04** (optimiser / MCO — measured improvement from real signal) cert evidence.

## Scope / Acceptance

- [ ] **Persist the trace id on the assistant message.** In the RAG answer path (`services/ragExecutor.ts` / `ConversationService` / the `/rag/stream` + `/:id/ask` handlers), capture the Langfuse trace id from the existing `startTrace(...)` handle and store it on the assistant `messages` row. Add a nullable `langfuse_trace_id` (text) column via a Drizzle migration. (No trace id when tracing is disabled → column stays null, feature degrades gracefully.)
- [ ] **Add a feedback column** to `messages`: `feedback` (enum/text `positive|negative` nullable) + `feedback_at` timestamp, via the same migration. This is the durable analytics record (independent of Langfuse).
- [ ] **Add the backend route** `POST /api/v1/conversations/:id/messages/:messageId/feedback` in `conversationRoutes.ts` + a `submitMessageFeedback` controller + service method. It must:
  - [ ] be `authenticate`d and **ownership-scoped** (the user owns the conversation; 404/403 otherwise) — consistent with the other conversation routes;
  - [ ] accept `{ feedback: 'positive' | 'negative' | null }` (matches the FE `MessageFeedbackData`); `null` clears a prior rating;
  - [ ] **persist** feedback + feedback_at on the message;
  - [ ] **push the Langfuse score** by calling the existing `logFeedback(message.langfuseTraceId, value, comment?)` — map `positive → 1`, `negative → 0`, `null → no-op/clear`. Non-fatal if trace id is null or tracing is off (persist still succeeds).
- [ ] **Return** the updated message so the FE optimistic update reconciles (FE already sets `{...message, feedback}` on success).
- [ ] **No frontend change required** beyond verifying the mutation works against the real route (the UI plumbing is already there). Confirm 👍/👎 now returns 200 and the rating survives a refetch (`GET /conversations/:id` should include `feedback` per message).
- [ ] **Tests (Tier-A layers):** L1 unit on the controller/service (positive/negative/clear, ownership denied); L2 integration against a real Postgres (feedback persists; migration applies); confirm the Langfuse call is invoked with the right `{traceId, value}` (mock the tracer).

## Notes / design

- **Reuse, don't rebuild:** `logFeedback` already encapsulates both Langfuse + LangSmith — the controller just calls it. The only genuinely new backend work is the migration + capturing/persisting the trace id + the route.
- **Why persist feedback in the DB *and* send a Langfuse score:** the DB row is the durable, queryable record (and survives if Langfuse is down/disabled); the Langfuse score is what the eval/experiment tooling reads. Both, not either.
- **Follow-on (not this story):** build a Langfuse **dataset** from thumbs-down traces for targeted eval / prompt-iteration — that's the actual "learn from feedback" loop; this story lays the rails for it.
- Encrypted `content`: feedback/trace-id columns are plaintext metadata — do not touch the app-layer content encryption.

## Dependencies

- Backend only; the FE is already wired. Relates to the per-product LLMOps standard (`reference_per_product_llmops`) and the eval loop in the AI-native SDLC harness.
