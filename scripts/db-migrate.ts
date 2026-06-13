// ─────────────────────────────────────────────────────────────
// Pearloom / scripts/db-migrate.ts
//
// Minimal migration runner. Reads every .sql file in
// supabase/migrations in lexical order and executes it against
// the database referenced by SUPABASE_DB_URL (the direct
// Postgres connection string — NOT the Supabase project URL).
//
// Usage:
//   SUPABASE_DB_URL='postgres://postgres:pw@host:5432/postgres' \
//     npx tsx scripts/db-migrate.ts
//
// Idempotent: migrations use CREATE TABLE IF NOT EXISTS and
// DROP POLICY IF EXISTS, so re-running is safe. Each file is
// wrapped in a single transaction.
// ─────────────────────────────────────────────────────────────

import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DB_URL = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

async function main() {
  if (!DB_URL) {
    console.error('SUPABASE_DB_URL or DATABASE_URL env var required.');
    console.error('Find it under Supabase → Project Settings → Database → Connection string.');
    process.exit(1);
  }

  // Lazy-load pg so the file can be read by tsc without the dep installed.
  let pg: typeof import('pg');
  try {
    pg = await import('pg');
  } catch {
    console.error('`pg` package is not installed. Run: npm i -D pg @types/pg');
    process.exit(1);
  }

  const dir = resolve(process.cwd(), 'supabase/migrations');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    console.log('No migrations found under supabase/migrations/');
    return;
  }

  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _pearloom_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    for (const file of files) {
      const already = await client.query(
        'SELECT 1 FROM _pearloom_migrations WHERE filename = $1',
        [file],
      );
      if (already.rowCount && already.rowCount > 0) {
        console.log(`• skip  ${file} (already applied)`);
        continue;
      }
      const sql = await readFile(resolve(dir, file), 'utf8');
      console.log(`• apply ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _pearloom_migrations(filename) VALUES($1)',
          [file],
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ ${file} failed:`, (err as Error).message);
        process.exit(2);
      }
    }

    console.log(`✓ ${files.length} migration file(s) processed.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
