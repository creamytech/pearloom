-- ─────────────────────────────────────────────────────────────
-- Pearloom / supabase/migrations/20260417_legacy_bootstrap.sql
--
-- Legacy-table bootstrap. The `sites`, `rsvps`, and `preview_tokens`
-- tables were originally created directly in the Supabase dashboard
-- (before the migrations folder existed). This file documents their
-- canonical shape so:
--
--   1. Fresh Supabase projects / preview branches provision the
--      schema correctly.
--   2. The two already-applied migrations (wedding_os, event_os)
--      which reference `sites(id)` have a defined table to FK against.
--
-- Every statement uses IF NOT EXISTS / DROP POLICY IF EXISTS so this
-- is a no-op on environments that already have the legacy tables.
-- ─────────────────────────────────────────────────────────────

-- ── sites ─────────────────────────────────────────────────────
-- Root record for a published wedding microsite. Keyed by a lowercase
-- `subdomain`; `ai_manifest` is the full StoryManifest JSON; `site_config`
-- holds metadata like `creator_email`, `names`, `slug`.

CREATE TABLE IF NOT EXISTS public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain text UNIQUE NOT NULL,
  ai_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  site_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  vibe_tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON public.sites(subdomain);
CREATE INDEX IF NOT EXISTS idx_sites_creator
  ON public.sites ((site_config->>'creator_email'));

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sites: public read" ON public.sites;
CREATE POLICY "sites: public read"
  ON public.sites FOR SELECT
  TO public, anon
  USING (true);

DROP POLICY IF EXISTS "sites: owner write" ON public.sites;
CREATE POLICY "sites: owner write"
  ON public.sites FOR ALL
  TO authenticated
  USING (site_config->>'creator_email' = auth.jwt() ->> 'email')
  WITH CHECK (site_config->>'creator_email' = auth.jwt() ->> 'email');

-- ── rsvps ─────────────────────────────────────────────────────
-- Guest-facing RSVP submissions. Keyed by site subdomain (string FK
-- rather than uuid FK so legacy inserts from static exports keep
-- working). Public inserts allowed; reads are owner-scoped.

CREATE TABLE IF NOT EXISTS public.rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  site_id text NOT NULL
    REFERENCES public.sites(subdomain) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  attending boolean NOT NULL,
  dietary text,
  guest_count int DEFAULT 1,
  song_request text,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_rsvps_site_id ON public.rsvps(site_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_created_at ON public.rsvps(created_at DESC);

ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rsvps: public insert" ON public.rsvps;
CREATE POLICY "rsvps: public insert"
  ON public.rsvps FOR INSERT
  TO public, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "rsvps: owner read" ON public.rsvps;
CREATE POLICY "rsvps: owner read"
  ON public.rsvps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.subdomain = rsvps.site_id
        AND s.site_config->>'creator_email' = auth.jwt() ->> 'email'
    )
  );

-- Keep anon reads enabled as a fallback so static exports can hydrate
-- lists without a session. Remove this policy once the dashboard uses
-- authenticated reads exclusively.
DROP POLICY IF EXISTS "rsvps: anon read (legacy)" ON public.rsvps;
CREATE POLICY "rsvps: anon read (legacy)"
  ON public.rsvps FOR SELECT
  TO anon
  USING (true);

-- ── preview_tokens ────────────────────────────────────────────
-- Short-lived share tokens for unpublished drafts. A 404 or missing
-- row falls back to the in-memory store in /api/preview.

CREATE TABLE IF NOT EXISTS public.preview_tokens (
  token text PRIMARY KEY,
  site_id text NOT NULL,
  manifest jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_preview_tokens_site_id
  ON public.preview_tokens(site_id);
CREATE INDEX IF NOT EXISTS idx_preview_tokens_expires_at
  ON public.preview_tokens(expires_at);

ALTER TABLE public.preview_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "preview_tokens: service only" ON public.preview_tokens;
CREATE POLICY "preview_tokens: service only"
  ON public.preview_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public reads allow /api/preview to resolve tokens without a session.
DROP POLICY IF EXISTS "preview_tokens: public read" ON public.preview_tokens;
CREATE POLICY "preview_tokens: public read"
  ON public.preview_tokens FOR SELECT
  TO public, anon
  USING (expires_at > now());

-- ── updated_at trigger for sites ──────────────────────────────

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sites_updated_at ON public.sites;
CREATE TRIGGER set_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();
