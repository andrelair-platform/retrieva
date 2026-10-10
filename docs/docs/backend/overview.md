---
sidebar_position: 1
---

# Backend Overview

The backend is built with Express 5 and follows a modular architecture with clear separation of concerns.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Express 5 |
| Runtime | Node.js 20+ |
| AI Orchestration | LangChain (@langchain/core, @langchain/openai, @langchain/qdrant) |
| LLM | via the platform **AI gateway (LiteLLM)**, OpenAI-compatible — the gateway owns provider routing, key rotation, retries/fallbacks, PII masking, budgets & EU governance |
| Embeddings | Self-hosted Ollama `bge-m3` (1024-dim), OpenAI fallback |
| Vector Store | Qdrant (via @langchain/qdrant) |
| Database | PostgreSQL (Drizzle ORM) |
| Cache | Redis |
| Queue | BullMQ |
| Real-Time | Socket.io |
| Export | xlsx (XLSX workbook generation) |
| Monitoring | Langfuse (LLM traces, prompts, cost) · Prometheus / Grafana |

## Directory Structure

```
backend/
├── config/             # Configuration modules
│   ├── db.ts           # PostgreSQL (pg Pool) connection + migrations on boot
│   ├── redis.js        # Redis connection
│   ├── queue.js        # BullMQ queues + schedulers
│   ├── llmProvider.ts  # Chat LLM client → the AI gateway (LiteLLM, OpenAI-compatible)
│   ├── embeddingProvider.ts  # Ollama bge-m3 embeddings (OpenAI fallback)
│   ├── tracing.ts      # Langfuse (traces, prompt mgmt, feedback)
│   ├── vectorStore.js  # Qdrant setup
│   ├── logger.js       # Winston logger
│   └── guardrails.js   # LLM guardrails config
├── controllers/        # Request handlers
│   ├── ragController.js
│   ├── authController.js
│   ├── conversationController.js
│   ├── workspaceController.js
│   ├── assessmentController.js
│   ├── questionnaireController.js
│   ├── exportController.js       # RoI export
│   └── analyticsController.js
├── middleware/         # Express middleware
│   ├── auth.js
│   ├── loadWorkspace.js
│   ├── workspaceAuth.js
│   ├── rateLimiter.js
│   ├── validate.js
│   └── errorHandler.js
├── db/
│   ├── schema/          # Drizzle tables (User, Workspace, Assessment, VendorQuestionnaire…)
│   ├── migrations/      # drizzle-kit SQL migrations (applied on boot)
│   └── tenantContext.ts # AsyncLocalStorage tenant scope (entityScopeCondition)
├── repositories/drizzle/  # typed data access (replaces Mongoose models)
├── routes/             # API routes
│   ├── ragRoutes.js
│   ├── authRoutes.js
│   ├── conversationRoutes.js
│   ├── workspaceRoutes.js        # /workspaces + /roi-export
│   ├── assessmentRoutes.js
│   ├── questionnaireRoutes.js
│   └── analyticsRoutes.js
├── services/           # Business logic
│   ├── rag.js                    # Core RAG service
│   ├── alertMonitorService.js    # Compliance monitoring alert checks
│   ├── roiExportService.js       # EBA RoI XLSX workbook generator
│   ├── emailService.js           # Resend email sending
│   ├── notificationService.js    # Dual-channel notifications
│   ├── deadLetterQueue.js        # Failed job tracking
│   ├── intent/                   # Intent classification
│   ├── rag/                      # RAG sub-modules
│   ├── memory/                   # Conversation memory
│   ├── context/                  # Context management
│   └── metrics/                  # Observability
├── utils/              # Utilities
│   ├── core/           # Core utilities
│   ├── rag/            # RAG utilities
│   └── security/       # Security utilities
├── workers/            # Background workers
│   ├── index.js                  # Worker entry + graceful shutdown
│   ├── assessmentWorker.js       # DORA gap analysis
│   ├── questionnaireWorker.js    # LLM questionnaire scoring
│   └── monitoringWorker.js       # 24h compliance alert scheduler
├── prompts/            # LLM prompts
│   └── ragPrompt.js
├── validators/         # Request validators
│   └── schemas.js
├── app.js              # Express app setup
└── index.js            # Entry point
```

## Entry Points

### index.js

Server initialization:

```javascript
// index.js

import { connectPg } from './config/db.js';
import { runMigrations } from './db/migrate.js';
import { createServer } from './app.js';
import { ragService } from './services/rag.js';
import { scheduleMonitoringJob } from './config/queue.js';
import './workers/monitoringWorker.js';

async function startServer() {
  // 1. Connect to PostgreSQL + apply Drizzle migrations (idempotent)
  await connectPg();
  await runMigrations();

  // 2. Pre-warm RAG system
  await ragService.init();

  // 3. Schedule compliance monitoring job (24h)
  await scheduleMonitoringJob().catch((err) =>
    logger.error('Failed to schedule monitoring job (non-critical)', { error: err.message })
  );

  // 4. Start Express server
  const app = await createServer();
  const server = app.listen(process.env.PORT || 3007);

  // Graceful shutdown
  process.on('SIGTERM', () => gracefulShutdown(server));
}

startServer();
```

### app.js

Express configuration:

```javascript
// app.js

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

export async function createServer() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors(corsOptions));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rate limiting
  app.use(rateLimiter);

  // Routes
  app.use('/api/v1/rag', ragRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/conversations', conversationRoutes);
  app.use('/api/v1/workspaces', workspaceRoutes);     // includes /roi-export
  app.use('/api/v1/assessments', assessmentRoutes);
  app.use('/api/v1/questionnaires', questionnaireRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);

  // Health check
  app.get('/health', healthCheck);

  // Error handling
  app.use(errorHandler);

  return app;
}
```

## Request Flow

```
Request
    │
    ▼
┌─────────────────┐
│ Security        │ ◀─── helmet, cors, rate limiting
│ Middleware      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Body Parsing    │ ◀─── JSON, cookies
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Authentication  │ ◀─── JWT validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Authorization   │ ◀─── Workspace access, permissions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validation      │ ◀─── Request body validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Controller      │ ◀─── Request handling
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Service         │ ◀─── Business logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Response        │ ◀─── Formatted response
└─────────────────┘
```

## Code Conventions

### ES6 Modules

```javascript
// Use ES6 imports
import express from 'express';
import { ragService } from './services/rag.js';

// Named exports preferred
export const myFunction = () => {};
export default class MyClass {}
```

### Async/Await

```javascript
// Always use async/await
export const getUser = async (id) => {
  const user = await User.findById(id);
  return user;
};

// Use catchAsync wrapper for controllers
export const createUser = catchAsync(async (req, res) => {
  const user = await User.create(req.body);
  sendSuccess(res, { user }, 201);
});
```

### Error Handling

```javascript
import { AppError } from '../utils/index.js';

// Throw AppError for known errors
if (!user) {
  throw new AppError('User not found', 404);
}

// Error handler middleware catches all
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});
```

### Response Formatting

```javascript
import { sendSuccess, sendError } from '../utils/index.js';

// Success response
sendSuccess(res, { user: userData }, 200, 'User created');

// Error response (use AppError instead)
throw new AppError('Validation failed', 400);
```

### Logging

```javascript
import logger from '../config/logger.js';

logger.info('Operation completed', {
  service: 'rag',
  userId: req.user._id,
  duration: Date.now() - startTime,
});

logger.error('Operation failed', {
  service: 'rag',
  error: error.message,
  stack: error.stack,
});
```

## Configuration

### Key Environment Variables

```bash
# Server
PORT=3007
NODE_ENV=development

# PostgreSQL (Drizzle)
DATABASE_URL=postgres://localhost:5432/retrieva

# Redis
REDIS_URL=redis://localhost:6378

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=documents

# LLM — the AI gateway (LiteLLM, OpenAI-compatible); the gateway resolves the model
LITELLM_BASE_URL=http://localhost:4000      # minicloud LiteLLM gateway (or any OpenAI-compatible /v1)
LITELLM_API_KEY=your-gateway-key
LLM_MODEL=tier-standard                     # gateway model name / intent alias

# Embeddings — self-hosted Ollama bge-m3 (OpenAI fallback)
EMBEDDING_PROVIDER=ollama
EMBEDDING_OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=bge-m3:latest

# JWT
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Compliance monitoring
MONITORING_INTERVAL_HOURS=24
INSTITUTION_NAME=Financial Entity
```

See [Environment Variables](/deployment/environment-variables) for the full reference.

### File Size Limit

Keep files under 500 lines. If exceeded, extract functionality into separate modules.

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests
npm test
```

## Common Commands

```bash
# Development
npm run dev

# Production
npm start

# Qdrant utilities
npm run qdrant:list
npm run qdrant:info
npm run qdrant:collections

# Compliance knowledge base
npm run seed:compliance
npm run seed:compliance:reset
```
