---
sidebar_position: 5
---

# LLM Model Selection

Retrieva does **not** pick a raw model, hold provider API keys, or rotate them. It is a **thin
OpenAI-compatible client over the platform AI gateway (LiteLLM)** — `config/llmProvider.ts`. The app
targets one endpoint (`/v1`) and selects a **model name / intent alias per purpose**; the *gateway*
resolves that alias to an underlying model and owns provider routing (Ollama Cloud, Azure OpenAI,
Bedrock…), key rotation, retries + fallbacks, PII masking, budgets and EU governance.

> This replaced the former in-app multi-provider factory (per-provider clients + 3-key Ollama
> rotation + LangChain `withFallbacks()`) — all redundant once the gateway provides it centrally.
> See [AI Infrastructure §1](./ai-infrastructure.md#1-language-model-layer).

## What the app controls vs. what the gateway controls

| Concern | Owner |
|---|---|
| Which **alias** each purpose uses (`chat` / `analysis` / `judge` / `formatter`) | **Retrieva** (env: `LLM_MODEL`, `LLM_<PURPOSE>_MODEL`) |
| Which **underlying model** an alias maps to, per environment | **Gateway** (LiteLLM config) |
| Provider routing, **key rotation**, `num_retries`, fallbacks, PII masking, budgets | **Gateway** |
| Per-call temperature / max-tokens / timeout | **Retrieva** (the per-purpose guardrails below) |

Because the alias is resolved at the gateway, the same Retrieva build runs unchanged in dev and prod —
dev may map `LLM_MODEL=ollama-cloud`, prod may map `tier-premium` / `tier-standard` — with no code or
image change.

## Per-purpose workloads

The four purposes (`LLM_PURPOSES = ['chat', 'analysis', 'judge', 'formatter']`) have different
speed/quality/cost demands. These are the requirements the gateway alias for each purpose must satisfy:

| Purpose | Used by | Temp | Max tokens | Key demand |
|---|---|---|---|---|
| `analysis` | DORA gap analysis (`gapAnalysisAgent.ts`) | 0 | ~4096 | Structured JSON, legal reasoning — the bottleneck |
| `chat` | RAG Q&A, streaming (`rag.ts`) | 0.3 | ~2000 | Instruction following, citations, latency |
| `judge` | questionnaire scoring + eval judge | 0.1 | ~500 | Calibrated, reproducible 0–100 scoring |
| `formatter` | JSON shaping | 0 | small | Fast, reliable format adherence |

**Requirements the chosen gateway model must meet (driven by gap analysis, the hardest task):**

- Reliable **structured JSON at temperature 0** up to ~4096 tokens.
- Accurate reading of **EU regulatory vocabulary** (DORA is a multilingual EU regulation; EBA/ESMA/EIOPA RTS references).
- A context window large enough for **k=15 retrieved chunks + conversation history** (≈7.5k+ tokens of context before the system prompt).

A premium tier (strong reasoning + JSON) fits `analysis`/`judge`; a faster standard tier fits the
streaming `chat` and `formatter` paths. Picking *which* concrete model backs each tier is a gateway
decision (and can change per environment) — Retrieva only names the tier.

## Changing the model

Set the alias(es) — not a raw model string — in the backend environment:

```bash
LLM_MODEL=tier-standard          # global default alias
LLM_ANALYSIS_MODEL=tier-premium  # override: gap analysis / judge want the stronger tier
LLM_JUDGE_MODEL=tier-premium
# dev convenience: LLM_MODEL=ollama-cloud
```

`resolveModelForPurpose()` reads `LLM_<PURPOSE>_MODEL` and falls back to `LLM_MODEL`
(`config/llmProvider.ts`). The value must be an alias the **gateway** knows; add or remap aliases in the
LiteLLM config, not in the app. No key rotation, provider flags, or `withFallbacks()` live in Retrieva.
