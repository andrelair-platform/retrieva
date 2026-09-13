// drizzle-kit config (RTV-47). Replaces migrate-mongo as the migration tool
// (the old migrate:* scripts stay until the RTV-49 cutover removes Mongo).
// Schema tables land in RTV-48 (Stage 2); this wires generate/migrate now.
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/index.js',
  out: './db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Keep generated SQL reviewable — this is cert defensibility evidence.
  verbose: true,
  strict: true,
});
