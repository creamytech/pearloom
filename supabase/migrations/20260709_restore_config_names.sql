-- ─────────────────────────────────────────────────────────────
-- 20260709_restore_config_names.sql
--
-- Data repair: restore site_config.names pairs wiped to ['','']
-- by manifest-only saves (the Studio autosave posted
-- { subdomain, manifest } and POST /api/sites passed
-- `names || ['','']` into saveSiteDraft, which overwrote the
-- stored pair on every save). The code fence landed the same
-- day (lib/site-names.ts + saveSiteDraft/publishSite guards);
-- this heals the rows that were already wiped, copying the
-- pair back from ai_manifest.names where it survived.
--
-- Idempotent: only touches rows whose config pair is empty or
-- malformed AND whose manifest carries at least one non-empty
-- name.
-- ─────────────────────────────────────────────────────────────

UPDATE public.sites
SET site_config = jsonb_set(
  COALESCE(site_config, '{}'::jsonb),
  '{names}',
  ai_manifest->'names',
  true
)
WHERE jsonb_typeof(ai_manifest->'names') = 'array'
  -- manifest pair carries at least one real name…
  AND COALESCE(
        NULLIF(TRIM(ai_manifest->'names'->>0), ''),
        NULLIF(TRIM(ai_manifest->'names'->>1), '')
      ) IS NOT NULL
  -- …and the config pair carries none (wiped, malformed, or absent).
  AND (
    site_config->'names' IS NULL
    OR jsonb_typeof(site_config->'names') <> 'array'
    OR COALESCE(
         NULLIF(TRIM(site_config->'names'->>0), ''),
         NULLIF(TRIM(site_config->'names'->>1), '')
       ) IS NULL
  );
