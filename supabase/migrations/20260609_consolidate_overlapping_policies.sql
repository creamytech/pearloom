-- The Supabase advisor flagged three "multiple permissive policies"
-- WARNs after the prior security migrations. Each is a case where
-- two SELECT policies cover the same role on the same table; both
-- evaluate per query, doubling the RLS cost for no extra gating.
--
-- 1. sites — "sites: owner write" was FOR ALL which silently included
--    SELECT, overlapping with "sites: public read". Split owner_write
--    into per-action policies (insert/update/delete) so SELECT is
--    uniquely covered by the public read policy.
-- 2. vendors — both an old "vendors: public read" (FOR SELECT USING
--    is_active=true) and the newer vendors_select_anon/auth (USING
--    active=true) existed. Drop the legacy one.

DROP POLICY IF EXISTS "sites: owner write" ON public.sites;
CREATE POLICY "sites: owner insert" ON public.sites FOR INSERT TO authenticated
  WITH CHECK (
    site_config->>'creator_email' = (select auth.jwt()) ->> 'email'
    OR creator_email = (select auth.jwt()) ->> 'email'
  );
CREATE POLICY "sites: owner update" ON public.sites FOR UPDATE TO authenticated
  USING (
    site_config->>'creator_email' = (select auth.jwt()) ->> 'email'
    OR creator_email = (select auth.jwt()) ->> 'email'
  )
  WITH CHECK (
    site_config->>'creator_email' = (select auth.jwt()) ->> 'email'
    OR creator_email = (select auth.jwt()) ->> 'email'
  );
CREATE POLICY "sites: owner delete" ON public.sites FOR DELETE TO authenticated
  USING (
    site_config->>'creator_email' = (select auth.jwt()) ->> 'email'
    OR creator_email = (select auth.jwt()) ->> 'email'
  );

DROP POLICY IF EXISTS "vendors: public read" ON public.vendors;
-- vendors_select_anon and vendors_select_auth (from 20260428) cover
-- SELECT for anon and authenticated respectively, both filtering
-- on active=true. No further policy needed here.
