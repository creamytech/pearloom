// migrate.mjs — build a Pearloom database from supabase/migrations
// alone (`npm run db:migrate`).
//
// This is the Sprint S contract (REVAMP-EXECUTION-PLAN §3): an empty
// Postgres + this script must yield a database the app actually runs
// on — no hand patches, no "apply these three files manually first".
// The staging fence workflow runs it against a throwaway postgres:16
// service and then drives the real app over it, so any migration
// that only works because prod already had the table gets caught on
// the PR that introduces it.
//
// Ordering: files run in lexical (filename) order, the same order
// the Supabase CLI uses. A handful of same-day files depend on a
// lexically-later sibling (e.g. 20260708_crew_threads references
// person_threads); rather than hand-keeping an override list, any
// file that fails is deferred and retried after the rest of the
// pass — multi-statement files sent as one query run in an implicit
// transaction, so a failed file leaves nothing behind. If a full
// pass makes no progress, the run aborts with every remaining error.
//
// Applied files are recorded in _pearloom_migrations using prod's
// exact shape (filename text primary key, applied_at timestamptz) —
// see CLAUDE-DESIGN.md §12 for the discipline this table anchors.
//
// Sibling: scripts/db-migrate.ts is the REMOTE applier (takes a
// SUPABASE_DB_URL, assumes a Supabase-hosted database that already
// has the anon/authenticated roles and auth schema). This script is
// the STAGING builder: it bootstraps those Supabase-isms onto a
// plain Postgres so the same migration files run unchanged.

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import pkg from 'pg';
const { Client } = pkg;

const REPO = join(dirname(new URL(import.meta.url).pathname), '..', '..');
const MIGRATIONS_DIR = join(REPO, 'supabase', 'migrations');

const cfg = {
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'pearloom',
};
const dbName = process.env.PGDATABASE || 'pearloom';

async function ensureDatabase() {
  const admin = new Client({ ...cfg, database: 'postgres' });
  await admin.connect();
  const { rows } = await admin.query('select 1 from pg_database where datname = $1', [dbName]);
  if (rows.length === 0) {
    // Identifier, not a value — quote it ourselves (dbName comes from
    // the operator's own env, not user input).
    await admin.query(`create database "${dbName.replace(/"/g, '""')}"`);
    console.log(`created database ${dbName}`);
  }
  await admin.end();
}

async function main() {
  await ensureDatabase();
  const client = new Client({ ...cfg, database: dbName });
  await client.connect();

  // Supabase-hosted databases ship these roles + extensions; migrations
  // reference them (RLS "to anon", gen_random_uuid). Provide them on a
  // plain Postgres so the same files run unchanged.
  await client.query(`
    do $$ begin
      if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
      if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
    end $$;
    create extension if not exists pgcrypto;
    create schema if not exists auth;
    create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table if not exists public._pearloom_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
    alter table public._pearloom_migrations enable row level security;
  `);

  const done = new Set(
    (await client.query('select filename from _pearloom_migrations')).rows.map((r) => r.filename),
  );
  let pending = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !done.has(f))
    .sort();

  let applied = 0;
  while (pending.length > 0) {
    const failures = [];
    const next = [];
    for (const file of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('begin');
        await client.query(sql);
        await client.query('insert into _pearloom_migrations (filename) values ($1) on conflict do nothing', [file]);
        await client.query('commit');
        applied += 1;
        console.log(`applied  ${file}`);
      } catch (e) {
        await client.query('rollback');
        next.push(file);
        failures.push(`${file}: ${e.message}`);
      }
    }
    if (next.length === pending.length) {
      console.error('\nNo progress — these migrations fail on a clean database:');
      for (const f of failures) console.error(`  ${f}`);
      process.exitCode = 1;
      break;
    }
    if (next.length > 0) console.log(`(retrying ${next.length} deferred file${next.length === 1 ? '' : 's'})`);
    pending = next;
  }

  await client.end();
  if (process.exitCode !== 1) {
    console.log(`\n${applied} applied, ${done.size} already recorded — database "${dbName}" is current.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
