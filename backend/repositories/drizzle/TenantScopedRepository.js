/**
 * Tenant-scoped Drizzle repository (RTV-49) — the SECURITY replacement for the
 * Mongoose tenantIsolationPlugin pre-hooks.
 *
 * Drizzle has no model hooks, so multi-tenant isolation is enforced EXPLICITLY here:
 * every read/update/delete is AND-ed with `workspace_id = getCurrentTenantId()`, and
 * create() stamps the workspace id from context. A missing tenant context throws
 * (fail-closed) rather than silently returning cross-tenant rows. Used by the
 * conversation / assessment / vendor-questionnaire repositories (the tables that had
 * the plugin). Non-tenant tables (users, organizations, workspaces) use the plain base.
 */
import { and, eq } from 'drizzle-orm';
import { BaseDrizzleRepository } from './BaseDrizzleRepository.js';
import { getCurrentTenantId } from '../../db/tenantContext.js';

export class TenantScopedRepository extends BaseDrizzleRepository {
  /**
   * @param {import('drizzle-orm/pg-core').PgTable} table
   * @param {{ tenantKey?: string, db?: * }} [opts] tenantKey = the JS column key (default 'workspaceId')
   */
  constructor(table, { tenantKey = 'workspaceId', db } = {}) {
    super(table, { db });
    this.tenantKey = tenantKey;
    this.tenantColumn = table[tenantKey];
    if (!this.tenantColumn) {
      throw new Error(`TenantScopedRepository: table has no '${tenantKey}' column`);
    }
  }

  /** Resolve the active tenant; throw (fail-closed) when required and absent. */
  _tenant(required = true) {
    const id = getCurrentTenantId();
    if (!id && required) {
      throw new Error('Tenant context required for this operation');
    }
    return id;
  }

  /** AND the caller's condition with the tenant filter. */
  _scoped(where) {
    const tenantFilter = eq(this.tenantColumn, this._tenant());
    return where ? and(tenantFilter, where) : tenantFilter;
  }

  async create(values) {
    return super.create({ ...values, [this.tenantKey]: this._tenant() });
  }

  async createMany(values) {
    const tenant = this._tenant();
    return super.createMany((values || []).map((v) => ({ ...v, [this.tenantKey]: tenant })));
  }

  async findById(id) {
    const [row] = await this.db
      .select()
      .from(this.table)
      .where(this._scoped(eq(this.table.id, id)))
      .limit(1);
    return row ?? null;
  }

  /**
   * EXPLICIT unscoped by-id lookup — bypasses tenant scoping. For trusted background
   * paths (BullMQ workers) that operate on a specific entity id WITHOUT a request tenant
   * context (the old Mongoose plugin didn't filter when no context was set). Named so the
   * bypass is auditable; never use it on a request path.
   */
  async findByIdUnscoped(id) {
    const [row] = await this.db.select().from(this.table).where(eq(this.table.id, id)).limit(1);
    return row ?? null;
  }

  /** EXPLICIT unscoped update/delete by id — same bypass contract as findByIdUnscoped
   *  (trusted worker/manual-authz paths). Never use on an unauthenticated request path. */
  async updateByIdUnscoped(id, values) {
    const [row] = await this.db
      .update(this.table)
      .set(values)
      .where(eq(this.table.id, id))
      .returning();
    return row ?? null;
  }

  async deleteByIdUnscoped(id) {
    const [row] = await this.db
      .delete(this.table)
      .where(eq(this.table.id, id))
      .returning();
    return row ?? null;
  }

  async findOne(where) {
    return super.findOne(this._scoped(where));
  }

  async find(where, opts) {
    return super.find(this._scoped(where), opts);
  }

  async updateById(id, values) {
    const [row] = await this.db
      .update(this.table)
      .set(values)
      .where(this._scoped(eq(this.table.id, id)))
      .returning();
    return row ?? null;
  }

  async updateWhere(where, values) {
    return super.updateWhere(this._scoped(where), values);
  }

  async deleteById(id) {
    const [row] = await this.db
      .delete(this.table)
      .where(this._scoped(eq(this.table.id, id)))
      .returning();
    return row ?? null;
  }

  async deleteWhere(where) {
    return super.deleteWhere(this._scoped(where));
  }

  async count(where) {
    return super.count(this._scoped(where));
  }

  async findPaginated(where, opts) {
    return super.findPaginated(this._scoped(where), opts);
  }
}
