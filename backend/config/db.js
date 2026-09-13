// PostgreSQL + Drizzle connection (RTV-47 — datastore migration, parent RTV-45).
//
// Runs IN PARALLEL with the Mongoose connection (config/database.js) until the
// RTV-49 cutover — this file only adds the Postgres path; nothing consumes it yet.
//
// The image is env-agnostic (Kargo prerequisite): the connection string is read
// from DATABASE_URL at runtime, never baked. Pool sizing mirrors the Mongoose
// pool (max 50 / min 10) so capacity planning (the tight per-namespace quotas)
// stays consistent across the cutover.
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import logger from './logger.js';
import * as schema from '../db/schema/index.js';

dotenv.config();

const { Pool } = pg;

let pool;
let db;

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
      idleTimeoutMillis: 45000,
      connectionTimeoutMillis: 10000,
    });
    // Pool-level errors (idle client dropped by the server, etc.) must never
    // crash the process — log and let pg re-establish on the next checkout.
    pool.on('error', (err) =>
      logger.error('Postgres pool error', { service: 'database', error: err.message })
    );
  }
  return pool;
}

/** Lazily create (and cache) the Drizzle instance bound to the pool + schema. */
export function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }
  return db;
}

/** Verify connectivity (SELECT 1) and return the Drizzle instance. */
export const connectPg = async () => {
  const database = getDb();
  await database.execute(sql`select 1`);
  logger.info('PostgreSQL connected', { service: 'database' });
  return database;
};

/** Close the pool (tests / graceful shutdown). Resets the cached handles. */
export const disconnectPg = async () => {
  if (pool) {
    await pool.end();
    pool = undefined;
    db = undefined;
    logger.info('PostgreSQL pool closed', { service: 'database' });
  }
};
