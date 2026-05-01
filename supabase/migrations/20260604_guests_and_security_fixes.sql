-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260604_guests_and_security_fixes.sql
--
-- Two jobs in one migration:
--
--   1. Create public.guests with the full column set the API
--      routes expect. This table was created originally via the
--      Supabase dashboard, and migrations 20260422 / 20260430 /
--      20260501 each ALTER it. On fresh projects the table never
--      existed, so those migrations no-oped and the API broke
--      with PGRST205 on every guests query. This builds the
--      table with everything those migrations wanted to add.
--
--   2. Close the v1 security holes the database linter flagged:
--      • public.sites had `Allow all` (USING true / WITH CHECK
--        true) — anyone with the anon key could read or modify
--        any site's manifest. Replace with public read + owner
--        write keyed on site_config->>'creator_email'.
--      • public.guestbook had RLS DISABLED. Enable it + restrict
--        anon to insert-only with a per-site post.
--      • public.site_analytics had RLS DISABLED. Enable it +
--        permit anon insert (visit logging) but no read.
--      • Eight RLS policies (venues, venue_spaces, seating_*,
--        registry_*, ai_proposals) called auth.uid() once per
--        row. Replace with (select auth.uid()) so the function
--        is called once per query.
-- ─────────────────────────────────────────────────────────────

-- ── 1. public.guests ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  -- Identity
  name text NOT NULL,
  email text,
  phone text,
  -- Plus-ones + party grouping
  party_label text,
  plus_one boolean DEFAULT false,
  plus_one_name text,
  plus_one_count int DEFAULT 0,
  -- Mailing address (CSV import + save-the-date / thank-you flows)
  mailing_address_line1 text,
  mailing_address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  -- Backwards-compat for code that writes a single jsonb mailing_address
  mailing_address jsonb,
  -- RSVP answers — legacy columns first, preset bag second
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'attending', 'declined', 'maybe')),
  attending boolean,
  meal_preference text,
  dietary_restrictions text,
  song_request text,
  message text,
  selected_events text[],
  rsvp_preset text,
  rsvp_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Personalized passport (per-guest URL)
  passport_token text,
  table_name text,
  -- Lifecycle
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

-- Upsert key used by /api/rsvp:
--   .upsert(..., { onConflict: 'site_id,email' })
CREATE UNIQUE INDEX IF NOT EXISTS guests_site_email_unique
  ON public.guests(site_id, lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS guests_site_idx ON public.guests(site_id);
CREATE INDEX IF NOT EXISTS guests_status_idx ON public.guests(site_id, status);
CREATE INDEX IF NOT EXISTS guests_import_batch_idx ON public.guests(import_batch_id);
CREATE INDEX IF NOT EXISTS guests_rsvp_preset_idx ON public.guests(rsvp_preset)
  WHERE rsvp_preset IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS guests_passport_token_idx
  ON public.guests(passport_token)
  WHERE passport_token IS NOT NULL;

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guests_deny_anon" ON public.guests;
CREATE POLICY "guests_deny_anon"
  ON public.guests
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- ── 2. Sites: close the Allow all hole ───────────────────────

DROP POLICY IF EXISTS "Allow all" ON public.sites;
DROP POLICY IF EXISTS "sites: public read" ON public.sites;
CREATE POLICY "sites: public read"
  ON public.sites FOR SELECT
  TO public, anon
  USING (true);

DROP POLICY IF EXISTS "sites: owner write" ON public.sites;
CREATE POLICY "sites: owner write"
  ON public.sites FOR ALL
  TO authenticated
  USING (
    site_config->>'creator_email' = (select auth.jwt() ->> 'email')
    OR creator_email = (select auth.jwt() ->> 'email')
  )
  WITH CHECK (
    site_config->>'creator_email' = (select auth.jwt() ->> 'email')
    OR creator_email = (select auth.jwt() ->> 'email')
  );

-- ── 3. Guestbook: enable RLS, anon-insert only ───────────────

ALTER TABLE public.guestbook ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guestbook: anon insert" ON public.guestbook;
CREATE POLICY "guestbook: anon insert"
  ON public.guestbook FOR INSERT
  TO public, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "guestbook: site owner read" ON public.guestbook;
CREATE POLICY "guestbook: site owner read"
  ON public.guestbook FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.subdomain = guestbook.site_id
        AND (
          s.creator_email = (select auth.jwt() ->> 'email')
          OR s.site_config->>'creator_email' = (select auth.jwt() ->> 'email')
        )
    )
  );

-- ── 4. site_analytics: enable RLS, anon-insert only ─────────

ALTER TABLE public.site_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_analytics: anon insert" ON public.site_analytics;
CREATE POLICY "site_analytics: anon insert"
  ON public.site_analytics FOR INSERT
  TO public, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "site_analytics: owner read" ON public.site_analytics;
CREATE POLICY "site_analytics: owner read"
  ON public.site_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.subdomain = site_analytics.site_id
        AND (
          s.creator_email = (select auth.jwt() ->> 'email')
          OR s.site_config->>'creator_email' = (select auth.jwt() ->> 'email')
        )
    )
  );

-- ── 5. Perf: wrap auth.uid() in subselect on existing policies ─
--
-- The Supabase linter flagged 8 policies where auth.uid() is
-- re-evaluated per row. Drop and recreate each with (select auth.uid()).

-- venues
DROP POLICY IF EXISTS "venues: user access only" ON public.venues;
CREATE POLICY "venues: user access only"
  ON public.venues
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

-- venue_spaces
DROP POLICY IF EXISTS "venue_spaces: user access via venue" ON public.venue_spaces;
CREATE POLICY "venue_spaces: user access via venue"
  ON public.venue_spaces
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_spaces.venue_id
        AND v.user_id = (select auth.uid())::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_spaces.venue_id
        AND v.user_id = (select auth.uid())::text
    )
  );

-- seating_tables
DROP POLICY IF EXISTS "seating_tables: user access only" ON public.seating_tables;
CREATE POLICY "seating_tables: user access only"
  ON public.seating_tables
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

-- seats
DROP POLICY IF EXISTS "seats: user access via table" ON public.seats;
CREATE POLICY "seats: user access via table"
  ON public.seats
  USING (
    EXISTS (
      SELECT 1 FROM public.seating_tables t
      WHERE t.id = seats.table_id
        AND t.user_id = (select auth.uid())::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.seating_tables t
      WHERE t.id = seats.table_id
        AND t.user_id = (select auth.uid())::text
    )
  );

-- seating_constraints
DROP POLICY IF EXISTS "seating_constraints: user access only" ON public.seating_constraints;
CREATE POLICY "seating_constraints: user access only"
  ON public.seating_constraints
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

-- registry_sources
DROP POLICY IF EXISTS "registry_sources: user access only" ON public.registry_sources;
CREATE POLICY "registry_sources: user access only"
  ON public.registry_sources
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

-- registry_items
DROP POLICY IF EXISTS "registry_items: user access via source" ON public.registry_items;
CREATE POLICY "registry_items: user access via source"
  ON public.registry_items
  USING (
    EXISTS (
      SELECT 1 FROM public.registry_sources rs
      WHERE rs.id = registry_items.source_id
        AND rs.user_id = (select auth.uid())::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.registry_sources rs
      WHERE rs.id = registry_items.source_id
        AND rs.user_id = (select auth.uid())::text
    )
  );

-- ai_proposals
DROP POLICY IF EXISTS "ai_proposals: user access only" ON public.ai_proposals;
CREATE POLICY "ai_proposals: user access only"
  ON public.ai_proposals
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

-- ── 6. rsvps: tighten the WITH CHECK true insert ────────────
--
-- Linter flagged "Allow public inserts" with WITH CHECK true. Replace
-- with a check that requires site_id to point at an existing site
-- — at least anonymous inserts can't drop rows tied to no site.

DROP POLICY IF EXISTS "Allow public inserts" ON public.rsvps;
DROP POLICY IF EXISTS "rsvps: public insert" ON public.rsvps;
CREATE POLICY "rsvps: public insert"
  ON public.rsvps FOR INSERT
  TO public, anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = rsvps.site_id)
  );
