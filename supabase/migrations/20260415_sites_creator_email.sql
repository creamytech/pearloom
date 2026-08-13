-- ─────────────────────────────────────────────────────────────
-- Pearloom / supabase/migrations/20260415_sites_creator_email.sql
--
-- Prep step for the Event OS migration sweep. Brings the live
-- `sites` schema in line with what every migration from
-- 20260416 onward expects.
--
-- The application originally stored creator_email inside
-- site_config JSONB; later RLS policies reference it as a
-- top-level column. This migration:
--
--   1. Adds `sites.creator_email text` if missing.
--   2. Backfills it from site_config->>'creator_email' for any
--      existing rows (so the current site row keeps its owner).
--   3. Indexes it for the policy lookups in subsequent migrations.
--
-- Idempotent — re-running this migration is a no-op.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE sites ADD COLUMN IF NOT EXISTS creator_email text;

UPDATE sites
SET creator_email = site_config->>'creator_email'
WHERE creator_email IS NULL
  AND site_config IS NOT NULL
  AND site_config->>'creator_email' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sites_creator_email
  ON sites(creator_email)
  WHERE creator_email IS NOT NULL;
