-- ─────────────────────────────────────────────────────────────
-- Drop the deprecated manifest.renderer field
--
-- The dual-renderer system (v8 / themed) was consolidated to
-- Themed-only in the Phase 4 renderer-unification work. Every
-- live site is now rendered by the Themed renderer; the
-- `renderer` discriminator on StoryManifest is moot.
--
-- See CLAUDE-PRODUCT.md §10 for the migration narrative.
--
-- Schema note: the StoryManifest JSON lives in the `ai_manifest`
-- jsonb column on public.sites (see 20260417_legacy_bootstrap.sql).
-- There is no separate `manifest` column on this table; some
-- internal docs/types refer to the JSON payload as "manifest"
-- shorthand, but the column itself is `ai_manifest`.
--
-- Approach: delete the key (cleaner than stamping every row with
-- the now-only value 'themed'). The renderer code already treats
-- a missing `renderer` field as Themed by default, so this is a
-- pure cleanup with no behavioural change. Idempotent — re-running
-- the migration after it has applied is a no-op (the WHERE clause
-- matches zero rows once the key is gone).
-- ─────────────────────────────────────────────────────────────

update public.sites
set ai_manifest = ai_manifest - 'renderer'
where ai_manifest ? 'renderer';
