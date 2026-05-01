-- Tighten the WITH CHECK on guestbook + site_analytics anon insert
-- to require site_id reference an existing site. Same pattern used
-- on rsvps; clears the linter's "WITH CHECK true" warning while
-- still allowing legit anonymous writes from the public site.

DROP POLICY IF EXISTS "guestbook: anon insert" ON public.guestbook;
CREATE POLICY "guestbook: anon insert"
  ON public.guestbook FOR INSERT
  TO public, anon
  WITH CHECK (
    site_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = guestbook.site_id)
  );

DROP POLICY IF EXISTS "site_analytics: anon insert" ON public.site_analytics;
CREATE POLICY "site_analytics: anon insert"
  ON public.site_analytics FOR INSERT
  TO public, anon
  WITH CHECK (
    site_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = site_analytics.site_id)
  );
