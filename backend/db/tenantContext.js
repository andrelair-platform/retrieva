/**
 * Request-scoped tenant context (RTV-49) — DB-agnostic.
 *
 * Extracted from the Mongoose-coupled services/tenantIsolation.js so the tenant
 * context survives the Mongo→Postgres cutover. The Mongoose pre-hook *plugin* is
 * replaced by explicit enforcement in the Drizzle TenantScopedRepository; this module
 * keeps only the AsyncLocalStorage context (workspaceId + userId) + the Express
 * middleware that populates it. No database import here on purpose.
 */
import { AsyncLocalStorage } from 'async_hooks';

const tenantContext = new AsyncLocalStorage();

/** @returns {string|null} active workspace/tenant id, or null outside a request. */
export function getCurrentTenantId() {
  return tenantContext.getStore()?.workspaceId ?? null;
}

/** @returns {string|null} active user id, or null. */
export function getCurrentUserId() {
  return tenantContext.getStore()?.userId ?? null;
}

/** Run `fn` within a tenant context (all repo ops inside are auto-scoped). */
export function withTenantContext(context, fn) {
  return tenantContext.run(context, fn);
}

/**
 * Express middleware — set the tenant context from the request. Use AFTER auth +
 * workspace-loading middleware. X-Workspace-Id is how the frontend signals the active
 * workspace; fall back to a loaded workspace doc / body / query.
 */
export function setTenantContext(req, _res, next) {
  const workspaceId =
    req.workspace?.id?.toString() ||
    req.workspace?._id?.toString() ||
    req.headers?.['x-workspace-id'] ||
    req.body?.workspaceId ||
    req.query?.workspaceId;
  const userId = req.user?.userId || req.user?.id;

  if (workspaceId || userId) {
    tenantContext.run({ workspaceId, userId }, () => next());
  } else {
    next();
  }
}
