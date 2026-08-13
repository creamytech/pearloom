-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260812_pearloom_guests_site_key.sql — Sprint G.1a
--
-- pearloom_guests.site_id had NO single convention: the 20260416
-- RLS policy (and the export/delete routes) assumed it held the
-- site SUBDOMAIN, while the only live writer — the passport
-- resolver's identity mint (lib/event-os/db.ts) — and eight
-- readers key it by sites.id (uuid, as text). Auto-minted rows
-- were therefore invisible to the owner-scoped RLS join and
-- SKIPPED by delete-account's subdomain-keyed purge.
--
-- The 2026-08-12 fork survey confirmed the live data is
-- uuid-keyed, so the uuid-as-text IS the convention now:
--   1. Backfill any legacy subdomain-keyed rows to the uuid.
--   2. Re-write the owner RLS policy to join on sites.id.
-- (The full fork collapse — merging pearloom_guests into guests
-- and rekeying its 13 FKs — is G.1b; see REVAMP-EXECUTION-PLAN §4.)
-- ─────────────────────────────────────────────────────────────

-- 1 · Backfill: subdomain-keyed rows → the site's uuid.
UPDATE pearloom_guests pg
SET site_id = s.id::text
FROM sites s
WHERE pg.site_id = s.subdomain
  AND pg.site_id <> s.id::text;

-- 1b · The passport passthrough tables carry pearloom_guests'
--      site_id verbatim (guest-passport submit writes guest.site_id
--      onto whispers / time_capsule / song_requests; memory-weave
--      writes memory_prompts) — normalize their legacy
--      subdomain-keyed rows the same way so the uuid readers (the
--      notification bell, memory-weave/invite, the memory book)
--      see every era's rows.
UPDATE memory_prompts t SET site_id = s.id::text FROM sites s
  WHERE t.site_id = s.subdomain AND t.site_id <> s.id::text;
UPDATE whispers t SET site_id = s.id::text FROM sites s
  WHERE t.site_id = s.subdomain AND t.site_id <> s.id::text;
UPDATE time_capsule t SET site_id = s.id::text FROM sites s
  WHERE t.site_id = s.subdomain AND t.site_id <> s.id::text;
UPDATE song_requests t SET site_id = s.id::text FROM sites s
  WHERE t.site_id = s.subdomain AND t.site_id <> s.id::text;

-- 2 · The owner policy joins on the uuid (kept tolerant of any
--     stragglers the backfill couldn't resolve: a text compare on
--     both keys, matching link_guests_to_people's existing cast).
DROP POLICY IF EXISTS "pearloom_guests: via site owner" ON pearloom_guests;
CREATE POLICY "pearloom_guests: via site owner"
  ON pearloom_guests
  USING (
    EXISTS (
      SELECT 1 FROM sites s
      WHERE (s.id::text = pearloom_guests.site_id OR s.subdomain = pearloom_guests.site_id)
        AND s.creator_email = COALESCE(auth.jwt() ->> 'email', '')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites s
      WHERE (s.id::text = pearloom_guests.site_id OR s.subdomain = pearloom_guests.site_id)
        AND s.creator_email = COALESCE(auth.jwt() ->> 'email', '')
    )
  );

COMMENT ON COLUMN pearloom_guests.site_id IS
  'sites.id as text (canonical since 2026-08-12; was ambiguously subdomain-or-uuid before — see 20260812_pearloom_guests_site_key.sql)';
