---
sidebar_position: 1
---

# API Reference

Retrieva exposes a RESTful API. **Every endpoint is documented by an auto-generated OpenAPI 3.0 specification served by the backend** — that spec is the single, always-current source of truth.

:::tip The authoritative reference is the live OpenAPI spec
The API reference is **generated from the code** (the same Zod schemas the routes validate with — see RTV-74), so it covers **every** endpoint and **cannot drift** from the implementation.

- **Swagger UI:** `GET /api-docs`
- **Raw spec (OpenAPI 3.0):** `GET /api-docs.json`

Running the backend locally, these are at `http://localhost:3007/api-docs` and `http://localhost:3007/api-docs.json`. In deployed environments they sit behind the platform's SSO/network gateway, like the rest of the app.
:::

:::note Why there are no hand-written endpoint pages here
This section used to carry hand-maintained pages per domain (auth, workspaces, conversations, …). They drifted from the code — they covered only part of the surface and even listed endpoints that no longer existed. They were removed in favour of the generated spec above, which is complete and self-maintaining. The narrative guides below (error handling, rate limiting) remain because they describe cross-cutting behaviour, not endpoint lists.
:::

## Base URL

All endpoints are prefixed with `/api/v1`.

```
Development: http://localhost:3007/api/v1
Production:  https://<deployed-host>/api/v1
```

## Authentication

Most endpoints require authentication via a JWT access token. Send it as the `accessToken` cookie (set automatically on login) or as a Bearer header:

```bash
# Cookie (preferred — set automatically on login)
Cookie: accessToken=eyJhbGciOiJIUzI1NiIs...

# Or Authorization header
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Public, token-gated routes (the vendor questionnaire and evidence portals, `/questionnaires/respond/:token`, `/public/evidence/:token`) require no session — they are marked `security: []` in the spec.

## Cross-cutting guides

- [Error handling](/api/error-handling) — the error envelope and status-code conventions
- [Rate limiting](/api/rate-limiting) — limits and the `X-RateLimit-*` headers
