-- Belt-and-braces deny-anon policies on cohost_invites + cohosts
-- (Supabase advisor flagged these as RLS-enabled-but-no-policies).
-- The /api/sites/co-host route uses the service-role client so
-- deny-anon is the correct posture: anonymous keys can't read or
-- write either.

DROP POLICY IF EXISTS "cohost_invites_deny_anon" ON public.cohost_invites;
CREATE POLICY "cohost_invites_deny_anon"
  ON public.cohost_invites AS RESTRICTIVE FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "cohosts_deny_anon" ON public.cohosts;
CREATE POLICY "cohosts_deny_anon"
  ON public.cohosts AS RESTRICTIVE FOR ALL TO anon USING (false);

-- Pin search_path on the trigger functions so a malicious user
-- can't shadow built-ins like now() via search_path manipulation.
-- Same pattern Supabase recommends for all SECURITY DEFINER and
-- trigger functions in public.

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_user_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
