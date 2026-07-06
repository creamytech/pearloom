-- ─────────────────────────────────────────────────────────────
-- Pearloom / supabase/migrations/20260706_backfill_creator_email_column.sql
--
-- Safety re-backfill of the top-level `sites.creator_email` column.
--
-- GET /api/sites and the plan-gate site-count now filter on the
-- INDEXED top-level `sites.creator_email` column (idx_sites_creator_email,
-- 20260415) instead of the un-indexed `site_config->>'creator_email'`
-- JSONB path — the old JSONB filter sequential-scanned the whole table
-- on every dashboard load.
--
-- 20260415 already backfilled the column and every write path
-- (saveSiteDraft / publishSite / adoptSite in src/lib/db.ts) keeps it
-- in sync, so this migration is EXPECTED TO BE A NO-OP. It exists as
-- belt-and-braces insurance for any row that ever slipped in with a
-- populated site_config->>'creator_email' but a NULL top-level column,
-- so switching the query axis can never drop a legacy row from a
-- host's dashboard.
--
-- Intentionally copies VERBATIM (no lowercasing) to match 20260415 and
-- to avoid perturbing any RLS policy that compares the column
-- case-sensitively — the API's case-insensitive `.ilike('creator_email', …)`
-- fallback resolves mixed-case legacy rows at read time.
--
-- Idempotent — re-running is a no-op. APPLIED to prod (project
-- vpwnpxowqflajvqpgvyb) 2026-07-06 via Supabase MCP + recorded in
-- _pearloom_migrations.
-- ─────────────────────────────────────────────────────────────

UPDATE sites
SET creator_email = site_config->>'creator_email'
WHERE creator_email IS NULL
  AND site_config IS NOT NULL
  AND site_config->>'creator_email' IS NOT NULL;
