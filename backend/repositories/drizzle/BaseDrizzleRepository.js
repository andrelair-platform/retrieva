/**
 * Drizzle-native repository base (RTV-49) — replaces the Mongoose BaseRepository.
 *
 * SQL-first + typed: methods take Drizzle `where` conditions (eq/and/…), not Mongo
 * criteria objects. Each repository subclass wraps one table and adds intent-named
 * methods (findByEmail, listByWorkspace, …) built on these primitives.
 */
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../config/db.js';

export class BaseDrizzleRepository {
  /**
   * @param {import('drizzle-orm/pg-core').PgTable} table
   * @param {{ db?: import('drizzle-orm/node-postgres').NodePgDatabase }} [opts] db is injectable for tests
   */
  constructor(table, { db } = {}) {
    if (!table) throw new Error('BaseDrizzleRepository requires a table');
    this.table = table;
    this._db = db;
  }

  /** The Drizzle db handle (injected in tests, else the app singleton). */
  get db() {
    return this._db || getDb();
  }

  async create(values) {
    const [row] = await this.db.insert(this.table).values(values).returning();
    return row;
  }

  async createMany(values) {
    if (!Array.isArray(values) || values.length === 0) return [];
    return this.db.insert(this.table).values(values).returning();
  }

  async findById(id) {
    const [row] = await this.db.select().from(this.table).where(eq(this.table.id, id)).limit(1);
    return row ?? null;
  }

  async findOne(where) {
    const [row] = await this.db.select().from(this.table).where(where).limit(1);
    return row ?? null;
  }

  /**
   * @param {*} [where] Drizzle condition
   * @param {{ orderBy?: *|Array, limit?: number, offset?: number }} [opts]
   */
  async find(where, { orderBy, limit, offset } = {}) {
    let q = this.db.select().from(this.table);
    if (where) q = q.where(where);
    if (orderBy) q = q.orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy]));
    if (limit !== undefined && limit !== null) q = q.limit(limit);
    if (offset !== undefined && offset !== null) q = q.offset(offset);
    return q;
  }

  async updateById(id, values) {
    const [row] = await this.db
      .update(this.table)
      .set(values)
      .where(eq(this.table.id, id))
      .returning();
    return row ?? null;
  }

  async updateWhere(where, values) {
    return this.db.update(this.table).set(values).where(where).returning();
  }

  async deleteById(id) {
    const [row] = await this.db.delete(this.table).where(eq(this.table.id, id)).returning();
    return row ?? null;
  }

  async deleteWhere(where) {
    return this.db.delete(this.table).where(where).returning();
  }

  async count(where) {
    const [r] = await this.db
      .select({ n: sql`count(*)::int` })
      .from(this.table)
      .where(where ?? sql`true`);
    return r.n;
  }

  async exists(where) {
    return (await this.count(where)) > 0;
  }

  /** Paginated list + total. @returns {{data,total,page,limit,totalPages,hasMore}} */
  async findPaginated(where, { page = 1, limit = 20, orderBy } = {}) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.find(where, { orderBy, limit, offset }),
      this.count(where),
    ]);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }
}
