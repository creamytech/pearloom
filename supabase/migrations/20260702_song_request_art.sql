-- ─────────────────────────────────────────────────────────────
-- Song requests → album art + 30-second previews
--
-- The living playlist (MusicBlock's "The guest playlist" strip)
-- lets guests pick a track from search results that carry album
-- art and a 30s preview clip (/api/music/search — Spotify when
-- keyed, iTunes otherwise). song_requests had nowhere to keep
-- either, so accepted tracks rendered art-less and silent.
--
-- Adds two nullable text columns:
--   art_url     — album-art thumbnail URL (https)
--   preview_url — 30-second preview clip URL (https)
--
-- Backwards compatible: existing rows get NULL for both; the
-- public GET + tracklist fall back gracefully when absent.
--
-- NOTE: per CLAUDE-DESIGN §12 this file must ALSO be applied to
-- prod (project vpwnpxowqflajvqpgvyb) via MCP and recorded in
-- _pearloom_migrations. It has NOT been applied automatically —
-- do that at review time, not from this session.
-- ─────────────────────────────────────────────────────────────

alter table public.song_requests
  add column if not exists art_url text,
  add column if not exists preview_url text;
