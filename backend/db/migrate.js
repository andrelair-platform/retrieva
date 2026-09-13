// Standalone migration runner (RTV-47). Applies db/migrations/ via Drizzle's
// node-postgres migrator. Runnable now (no-ops safely until RTV-48 generates the
// first migration) and used at deploy time once tables exist.
//
//   npm run db:migrate            # apply pending migrations
//   npm run db:generate           # (drizzle-kit) generate a migration from the schema
import 'dotenv/config';
import { existsSync } from 'node:fs';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, disconnectPg } from '../config/db.js';
import logger from '../config/logger.js';

const MIGRATIONS_FOLDER = './db/migrations';

export const runMigrations = async () => {
  // Drizzle's migrator requires a meta/_journal.json; skip cleanly before the
  // first migration exists (RTV-47 plumbing) instead of throwing.
  if (!existsSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`)) {
    logger.info('No Drizzle migrations yet — nothing to apply', { service: 'database' });
    return;
  }
  const db = getDb();
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  logger.info('Drizzle migrations applied', { service: 'database' });
};

// Executed directly (node db/migrate.js) — not when imported.
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => disconnectPg())
    .then(() => process.exit(0))
    .catch(async (err) => {
      logger.error('Migration failed', { service: 'database', error: err.message });
      await disconnectPg().catch(() => {});
      process.exit(1);
    });
}
