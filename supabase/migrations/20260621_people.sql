-- ─────────────────────────────────────────────────────────────
-- 20260621_people.sql — persistent guest identity (the event graph,
-- phase 1).
--
-- A `person` is one human across every celebration on Pearloom,
-- keyed by lowercase email. Guests rows (per-site RSVP/roster
-- records) and pearloom_guests rows (per-site identity/passport
-- records) both link to it via person_id, so:
--   • a guest who RSVPs to one wedding is recognized at the next
--     event (known dietary, returning-guest hints for hosts),
--   • the guest's own passport page can show "your celebrations"
--     across the platform,
--   • future phases (opt-in connections, event-scoped messaging)
--     have a stable identity node to hang off.
--
-- Privacy posture:
--   • connections_opt_in defaults FALSE — cross-guest visibility
--     ("people you've celebrated with") ships in a later phase and
--     is opt-in per person. Nothing in this phase exposes one
--     guest to another.
--   • Hosts only ever see history from their OWN sites (enforced
--     in /api/guests/person-history, service-role reads).
--   • Belt-and-braces RLS: restrictive deny-anon, service-role
--     API only (CLAUDE-DESIGN.md §14.3).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stored lowercase + trimmed; the unique key for identity merge.
  email text NOT NULL UNIQUE,
  -- Latest-known profile facts (refreshed on every RSVP / add).
  display_name text,
  phone text,
  dietary text,
  -- Phase-2 flag: whether this person is discoverable to people
  -- they have celebrated with. DEFAULT FALSE — never on silently.
  connections_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_deny_anon" ON public.people;
CREATE POLICY "people_deny_anon"
  ON public.people
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- Link columns on both guest tables.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS guests_person_id_idx ON public.guests(person_id);
-- Cross-site lookups by normalized email (history, linking).
CREATE INDEX IF NOT EXISTS guests_email_lower_idx ON public.guests (lower(trim(email)))
  WHERE email IS NOT NULL;

ALTER TABLE public.pearloom_guests
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS pearloom_guests_person_id_idx ON public.pearloom_guests(person_id);

-- ── Linker — idempotent, callable from API routes ─────────────
-- UPDATE … FROM isn't expressible through the Supabase JS client,
-- so bulk flows (CSV import) upsert their people rows in one batch
-- and then call this to stitch person_id across the site's rows.
CREATE OR REPLACE FUNCTION public.link_guests_to_people(p_site_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer := 0;
  m integer := 0;
BEGIN
  UPDATE public.guests g
  SET person_id = p.id
  FROM public.people p
  WHERE g.person_id IS NULL
    AND g.email IS NOT NULL
    AND lower(trim(g.email)) = p.email
    AND (p_site_id IS NULL OR g.site_id = p_site_id);
  GET DIAGNOSTICS n = ROW_COUNT;

  UPDATE public.pearloom_guests pg
  SET person_id = p.id
  FROM public.people p
  WHERE pg.person_id IS NULL
    AND pg.email IS NOT NULL
    AND lower(trim(pg.email)) = p.email
    AND (p_site_id IS NULL OR pg.site_id::text = p_site_id::text);
  GET DIAGNOSTICS m = ROW_COUNT;

  RETURN n + m;
END;
$$;

REVOKE ALL ON FUNCTION public.link_guests_to_people(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.link_guests_to_people(uuid) FROM authenticated;

-- ── Backfill — seed people from every guest row with an email ──
-- Most-recent row per email wins the profile facts.
INSERT INTO public.people (email, display_name, phone, dietary)
SELECT DISTINCT ON (lower(trim(g.email)))
  lower(trim(g.email)),
  g.name,
  g.phone,
  g.dietary_restrictions
FROM public.guests g
WHERE g.email IS NOT NULL AND trim(g.email) <> ''
ORDER BY lower(trim(g.email)), g.created_at DESC NULLS LAST
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.people (email, display_name, phone)
SELECT DISTINCT ON (lower(trim(pg.email)))
  lower(trim(pg.email)),
  pg.display_name,
  pg.phone
FROM public.pearloom_guests pg
WHERE pg.email IS NOT NULL AND trim(pg.email) <> ''
ORDER BY lower(trim(pg.email)), pg.created_at DESC NULLS LAST
ON CONFLICT (email) DO NOTHING;

SELECT public.link_guests_to_people(NULL);
