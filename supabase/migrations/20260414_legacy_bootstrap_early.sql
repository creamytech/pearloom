-- ─────────────────────────────────────────────────────────────
-- Pearloom / supabase/migrations/20260414_legacy_bootstrap_early.sql
--
-- Fresh-database ordering fix. 20260417_legacy_bootstrap.sql
-- documents the dashboard-created legacy tables (sites / rsvps /
-- preview_tokens) — but it sorts AFTER 20260415 + 20260416, which
-- ALTER and FK those tables. Existing environments never noticed
-- (the tables predate the migrations folder), but every FRESH
-- database — Supabase preview branches included — failed at
-- 20260415 with `relation "sites" does not exist`, which is why
-- the Supabase Preview check has been red on every PR.
--
-- This file is a verbatim, fully idempotent copy of 20260417
-- ordered before its first dependent. Both files no-op wherever
-- the other has already run.
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

-- Columns added directly in the dashboard over time — no migration
-- ever carried them (20260419 indexes `published`; the renderer
-- reads `theme_override`), so fresh databases get them here.
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS theme_override jsonb;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS published boolean DEFAULT false;

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

-- ── guests ────────────────────────────────────────────────────
-- The RSVP store (public.guests) was also dashboard-created.
-- 20260422 indexes it and 20260604 re-declares it IF NOT EXISTS,
-- but nothing earlier creates it — fresh databases broke at
-- 20260422. Base shape mirrors production; columns owned by later
-- migrations (rsvp_preset/rsvp_answers → 20260422, email tracking
-- → 20260612) are deliberately absent so those files stay the
-- owners.

CREATE TABLE IF NOT EXISTS public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  party_label text,
  plus_one boolean DEFAULT false,
  plus_one_name text,
  plus_one_count integer DEFAULT 0,
  mailing_address_line1 text,
  mailing_address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  mailing_address jsonb,
  status text DEFAULT 'pending',
  attending boolean,
  meal_preference text,
  dietary_restrictions text,
  song_request text,
  message text,
  selected_events text[],
  passport_token text,
  table_name text,
  invited_at timestamptz,
  responded_at timestamptz,
  imported_at timestamptz,
  import_batch_id text,
  address_collection_token text,
  address_collected_at timestamptz,
  guest_token text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- (The canonical unique index — guests_site_email_unique on
--  (site_id, lower(email)) — is owned by 20260604.)
CREATE INDEX IF NOT EXISTS guests_site_idx ON public.guests(site_id);
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- ── guestbook ─────────────────────────────────────────────────
-- Public guest signatures. ALTERed by 20260615 (guest_id) but
-- never created by any migration.

CREATE TABLE IF NOT EXISTS public.guestbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text,
  guest_name text,
  message text,
  highlighted boolean DEFAULT false,
  created_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_guestbook_site ON public.guestbook(site_id);
ALTER TABLE public.guestbook ENABLE ROW LEVEL SECURITY;

-- ── site_analytics ────────────────────────────────────────────
-- Visit beacons. ALTERed by later security migrations but never
-- created by any migration.

CREATE TABLE IF NOT EXISTS public.site_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text,
  device text,
  referrer text,
  visited_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_site_analytics_site ON public.site_analytics(site_id);
ALTER TABLE public.site_analytics ENABLE ROW LEVEL SECURITY;
