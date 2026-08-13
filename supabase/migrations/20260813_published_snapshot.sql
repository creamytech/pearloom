-- ─────────────────────────────────────────────────────────────
-- 20260813_published_snapshot — the staged-editing snapshot (C.2).
--
-- REVAMP-EXECUTION-PLAN §9 C.2 (NEW-USER-REVAMP L19): every edit
-- to a published site went live to guests in ~2 seconds — the 2s
-- autosave posted straight into the served ai_manifest with no
-- draft state and no warning.
--
-- The model:
--   • editing-live (default, today's behavior, now SAID OUT LOUD):
--     published_manifest stays NULL and the public routes serve
--     ai_manifest — plus an honest editor banner.
--   • staged: publish/update stamps published_manifest with the
--     manifest being published; the public routes serve THAT
--     snapshot while edits accumulate in ai_manifest until the
--     host presses "Update site".
--
-- The mode itself rides the manifest (manifest.editMode) — this
-- column is only the snapshot.
-- ─────────────────────────────────────────────────────────────

alter table public.sites
  add column if not exists published_manifest jsonb;

comment on column public.sites.published_manifest is
  'Staged-editing snapshot (C.2): when non-null, public site routes serve THIS manifest; ai_manifest is the working copy. NULL = editing-live (public routes serve ai_manifest, the pre-C.2 behavior).';
