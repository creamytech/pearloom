-- ─────────────────────────────────────────────────────────────
-- photo_reactions — guest reactions on gallery photos.
--
-- Guests on the public site can heart any photo in the gallery.
-- One row per (site, photo, reactor_token) so a single guest can't
-- inflate a photo's count by reloading. The reactor_token is a
-- random ID stored in a long-lived cookie set by the API route the
-- first time a guest reacts on this site — no auth required.
--
-- The renderer reads /api/gallery/reactions to draw a heart count
-- on each tile and a "Most loved" badge on the top photo. The
-- lightbox surfaces the toggle.
--
-- RLS: belt-and-braces deny-anon. The two API routes use the
-- service-role client.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS photo_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL,
  photo_url text NOT NULL,
  reactor_token text NOT NULL,
  kind text NOT NULL DEFAULT 'love' CHECK (kind IN ('love')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, photo_url, reactor_token, kind)
);

CREATE INDEX IF NOT EXISTS idx_photo_reactions_site_photo
  ON photo_reactions(site_id, photo_url);

ALTER TABLE photo_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "photo_reactions_deny_anon" ON photo_reactions;
CREATE POLICY "photo_reactions_deny_anon"
  ON photo_reactions
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);
