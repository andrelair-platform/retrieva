---
sidebar_position: 6
---

# Configuration

Configuration modules manage connections to external services and application settings.

## Database Configuration

### PostgreSQL + Drizzle (`config/db.ts`)

Drizzle ORM over a `pg` connection pool. `connectPg()` opens the pool from `DATABASE_URL`;
`runMigrations()` (`db/migrate.ts`) applies pending Drizzle migrations on boot (idempotent).

```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

let pool: Pool | null = null;

/** Lazily create (and cache) the pg Pool. Reads DATABASE_URL at call time. */
export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set — cannot open a Postgres pool');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX ?? 50),
      min: Number(process.env.PG_POOL_MIN ?? 10),
    });
  }
  return pool;
}

export const db = drizzle(getPool());

export async function connectPg() {
  await getPool().query('SELECT 1'); // fail fast if the DB is unreachable
}
```

### Redis (`config/redis.js`)

```javascript
import { Redis } from 'ioredis';
import logger from './logger.js';

export const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6378,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

// For BullMQ (needs IORedis instance)
export const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6378,
};
```

## LLM Configuration

### LLM Provider (`config/llmProvider.ts`) — the AI gateway client

A **single** OpenAI-compatible client pointed at the platform **AI gateway (LiteLLM)**. The gateway
owns provider routing (Ollama Cloud, Azure, Bedrock…), key rotation, retries/fallbacks, PII masking,
budgets and EU governance — so the app carries none of that. Callers pick a **model name / intent
alias** (`tier-premium`, `tier-standard`, …) per `purpose` / `LLM_MODEL`; the gateway resolves it.

```typescript
import { ChatOpenAI } from '@langchain/openai';

// baseURL is normalised to end in /v1 (OpenAI-compatible gateway endpoint).
const GATEWAY_BASE_URL = normaliseGatewayUrl(process.env.LITELLM_BASE_URL);
const GATEWAY_API_KEY = process.env.LITELLM_API_KEY;

export async function createLLM({ purpose = 'chat', temperature, maxTokens, jsonMode } = {}) {
  const model = process.env[`LLM_${purpose.toUpperCase()}_MODEL`] || process.env.LLM_MODEL;
  return new ChatOpenAI({
    model,                              // a gateway model name / intent alias
    apiKey: GATEWAY_API_KEY,
    configuration: { baseURL: GATEWAY_BASE_URL },
    temperature: temperature ?? 0.1,
    maxTokens: maxTokens ?? 2048,
    // json_object → LiteLLM maps to the provider's native JSON mode
    ...(jsonMode ? { modelKwargs: { response_format: { type: 'json_object' } } } : {}),
  });
}
```

### Embeddings (`config/embeddingProvider.ts`)

Embeddings run on **self-hosted Ollama `bge-m3`** (1024-dimension vectors) — *not* through the gateway
(Ollama Cloud doesn't serve the embeddings API), with an OpenAI (`text-embedding-3-small`) fallback.
Hybrid cloud/local routing honours per-workspace consent (GDPR).

```typescript
import { OllamaEmbeddings } from '@langchain/ollama';
import { OpenAIEmbeddings } from '@langchain/openai';

const baseEmbeddings = new OllamaEmbeddings({
  baseUrl: process.env.EMBEDDING_OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.EMBEDDING_MODEL || 'bge-m3:latest',   // 1024-dim
});
// OpenAI text-embedding-3-small is used as the fallback provider.

export const embeddings = new BatchedEmbeddings(baseEmbeddings, BATCH_CONFIG);
```

#### Batch Configuration

```javascript
export const BATCH_CONFIG = {
  maxChunks: parseInt(process.env.EMBEDDING_BATCH_MAX_CHUNKS) || 50,  // max chunks per API call
  maxTokens: parseInt(process.env.EMBEDDING_BATCH_MAX_TOKENS) || 8192, // max tokens per batch
  charsPerToken: 4,                                                     // estimation ratio
};
```

Batches are split whenever either limit (`maxChunks` or `maxTokens`) would be exceeded. Each batch is sent as a single `embedDocuments()` call.

#### Truncation & Retry

Texts exceeding `maxCharsPerChunk` are truncated before embedding. If the API still returns a context-length error, the system retries with progressively shorter inputs:

| Attempt | Text length |
|---------|------------|
| 1 | Full (truncated to `maxCharsPerChunk`) |
| 2 | 50% of original |
| 3 | 25% of original |
| 4 | 10% of original (minimum 100 chars) |

#### Metrics

```javascript
import { getEmbeddingMetrics } from './config/embeddings.js';

const m = getEmbeddingMetrics();
// { totalChunksEmbedded, totalBatches, chunksPerSecond, avgBatchLatencyMs, errors, truncations }
```

## Vector Store Configuration

### Qdrant (`config/vectorStore.js`)

```javascript
import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantVectorStore } from '@langchain/qdrant';
import { getEmbeddings } from './embeddings.js';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
});

export async function getVectorStore(documents = []) {
  const embeddings = await getEmbeddings();
  const collectionName = process.env.QDRANT_COLLECTION_NAME || 'documents';

  // Ensure collection exists
  const collections = await qdrantClient.getCollections();
  const exists = collections.collections.some(c => c.name === collectionName);

  if (!exists) {
    await qdrantClient.createCollection(collectionName, {
      vectors: {
        size: 1024,  // bge-m3 embedding dimension
        distance: 'Cosine',
      },
    });
  }

  return new QdrantVectorStore(embeddings, {
    client: qdrantClient,
    collectionName,
  });
}

export { qdrantClient };
```

## Queue Configuration

### BullMQ Queues (`config/queue.js`)

```javascript
import { Queue } from 'bullmq';
import { redisConnection } from './redis.js';

export const assessmentQueue = new Queue('assessmentJobs', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
    removeOnComplete: { count: 50, age: 7 * 24 * 60 * 60 },
    removeOnFail: { count: 100 },
  },
});
```

## Logging Configuration

### Winston Logger (`config/logger.js`)

```javascript
import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'rag-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
  }));
}

export default logger;
```

## Guardrails Configuration

### LLM Guardrails (`config/guardrails.js`)

```javascript
export const guardrailsConfig = {
  input: {
    maxLength: 5000,
    blockedPatterns: [
      /ignore previous instructions/i,
      /disregard.*system/i,
    ],
  },

  output: {
    hallucinationBlocking: {
      enabled: true,
      strictMode: process.env.STRICT_HALLUCINATION_MODE === 'true',
    },
    confidenceHandling: {
      minConfidence: 0.4,
      messages: {
        blocked: "I wasn't able to find reliable information about this topic in your documents.",
        warning: "Note: This answer has lower confidence.",
      },
    },
  },

  retrieval: {
    maxDocuments: 15,
    maxRetryDocuments: 20,
    minRelevanceScore: 0.3,
  },

  generation: {
    retry: {
      enabled: true,
      minConfidenceForRetry: 0.2,
      retryTimeoutMs: 30000,
      cooldownMs: 1000,
    },
  },
};
```

## Environment Variables

### Complete `.env.example`

```bash
# ===========================================
# Server Configuration
# ===========================================
PORT=3007
NODE_ENV=development
LOG_LEVEL=info

# ===========================================
# PostgreSQL (Drizzle)
# ===========================================
DATABASE_URL=postgres://localhost:5432/retrieva

# ===========================================
# Redis
# ===========================================
REDIS_URL=redis://localhost:6378

# ===========================================
# Qdrant Vector Store
# ===========================================
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=documents

# ===========================================
# LLM — the AI gateway (LiteLLM, OpenAI-compatible); the gateway resolves the model
# ===========================================
LITELLM_BASE_URL=http://localhost:4000       # minicloud LiteLLM gateway (or any OpenAI-compatible /v1)
LITELLM_API_KEY=your-gateway-key
LLM_MODEL=tier-standard                      # gateway model name / intent alias
# LLM_JUDGE_MODEL=tier-standard              # per-purpose override (chat|analysis|judge|formatter)

# ===========================================
# Embeddings — self-hosted Ollama bge-m3 (OpenAI fallback)
# ===========================================
EMBEDDING_PROVIDER=ollama
EMBEDDING_OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=bge-m3:latest                # 1024-dim

# ===========================================
# Embedding Batching (optional — defaults shown)
# ===========================================
EMBEDDING_MAX_CONCURRENCY=10          # parallel API calls (S0 tier: 5-10 safe)
EMBEDDING_BATCH_MAX_CHUNKS=50         # max chunks per batch request
EMBEDDING_BATCH_MAX_TOKENS=8192       # max tokens per batch request
EMBEDDING_CONTEXT_TOKENS=8192         # model context window (for per-chunk truncation)

# ===========================================
# LLM Timeouts
# ===========================================
LLM_INVOKE_TIMEOUT=60000
LLM_STREAM_INITIAL_TIMEOUT=30000
LLM_STREAM_CHUNK_TIMEOUT=10000

# ===========================================
# JWT Authentication
# ===========================================
JWT_ACCESS_SECRET=             # generate: openssl rand -base64 48
JWT_REFRESH_SECRET=            # generate: openssl rand -base64 48
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ===========================================
# Encryption
# ===========================================
ENCRYPTION_KEY=                # generate: openssl rand -hex 32

# ===========================================
# CORS
# ===========================================
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000

# ===========================================
# Chunking Configuration
# ===========================================
MAX_GROUP_TOKENS=400
MIN_GROUP_TOKENS=200
MAX_LIST_ITEMS=15

# ===========================================
# Quality Guardrails
# ===========================================
GUARDRAIL_STRICT_HALLUCINATION_BLOCKING=true
ENABLE_CODE_FILTER=true

# ===========================================
# Observability
# ===========================================
LOG_RETRIEVAL_TRACE=false
# Langfuse (self-hosted LLMOps: traces, prompt management, feedback, cost)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASEURL=
LANGFUSE_TRACING_ENVIRONMENT=development
```

## Configuration Validation

```javascript
// config/envValidator.js

const requiredVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'QDRANT_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

export function validateEnv() {
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET.length < 32) {
    console.warn('WARNING: JWT_SECRET should be at least 32 characters');
  }
}
```
