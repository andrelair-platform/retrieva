/**
 * PostgreSQL integration-test harness (RTV-47).
 *
 * Strategy (see ADR datastore-postgresql + the RTV-47 story AC-4):
 *  - CI provides a real Postgres via a GitHub Actions **service container** →
 *    DATABASE_URL is already set → use it directly (no Docker-in-Docker).
 *  - Locally, spin an ephemeral **testcontainer** (real postgres:16-alpine) so the
 *    engine is identical to prod — required because the cert's defining query is a
 *    `WITH RECURSIVE` traversal (RTV-50) that emulators like pg-mem can't run.
 *
 * If neither DATABASE_URL nor Docker is available, startPg() throws — integration
 * tests must run against a real engine, never silently skip the thing they prove.
 */
let container;

/** Start (or reuse) a Postgres and export its URL as DATABASE_URL. Returns the URL. */
export const startPg = async () => {
  if (process.env.DATABASE_URL) {
    // CI service container (or a developer-provided DB).
    return process.env.DATABASE_URL;
  }
  const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  return process.env.DATABASE_URL;
};

/** Stop the testcontainer (no-op when using an external DATABASE_URL). */
export const stopPg = async () => {
  if (container) {
    await container.stop();
    container = undefined;
  }
};
