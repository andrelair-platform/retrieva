/**
 * RTV-47 plumbing proof — the Postgres/Drizzle client connects to a REAL engine
 * and trivial DDL/DML applies through it. Schema + CRUD tests land in RTV-48.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { startPg, stopPg } from './pgSetup.js';
import { connectPg, disconnectPg, getDb } from '../../config/db.js';

describe('Postgres/Drizzle plumbing (RTV-47)', () => {
  beforeAll(async () => {
    await startPg();
    await connectPg();
  });

  afterAll(async () => {
    await disconnectPg();
    await stopPg();
  });

  it('connects to a real Postgres and runs SELECT 1', async () => {
    const db = getDb();
    const res = await db.execute(sql`select 1 as ok`);
    expect(res.rows[0].ok).toBe(1);
  });

  it('reports a Postgres server version (proves a real engine, not an emulator)', async () => {
    const db = getDb();
    const res = await db.execute(sql`show server_version`);
    expect(res.rows[0].server_version).toMatch(/^16\./);
  });

  it('applies trivial DDL + DML through the Drizzle client', async () => {
    const db = getDb();
    await db.execute(sql`create table if not exists _plumbing_check (id integer primary key)`);
    await db.execute(sql`insert into _plumbing_check (id) values (1)`);
    const res = await db.execute(sql`select count(*)::int as n from _plumbing_check`);
    expect(res.rows[0].n).toBe(1);
    await db.execute(sql`drop table _plumbing_check`);
  });

  it('supports WITH RECURSIVE (the RTV-50 substrate)', async () => {
    // A trivial 1..5 recursion — proves the engine runs recursive CTEs, the
    // exact capability pg-mem lacks and the reason RTV-45 chose real Postgres.
    const db = getDb();
    const res = await db.execute(sql`
      with recursive c(n) as (
        select 1
        union all
        select n + 1 from c where n < 5
      )
      select max(n)::int as max_n from c
    `);
    expect(res.rows[0].max_n).toBe(5);
  });
});
