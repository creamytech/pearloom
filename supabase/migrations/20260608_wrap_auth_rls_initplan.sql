-- The Supabase performance advisor flags any RLS policy that calls
-- auth.<function>() directly: the function is re-evaluated per row.
-- Wrapping the call in (select auth.func()) lets Postgres cache the
-- value once per query (an InitPlan node). This migration regenerates
-- every event_os-era policy with the wrapped form.
--
-- The wrap pattern matters: the linter regex looks for the literal
-- token `auth.jwt()` not preceded by `select`, so the SELECT must
-- wrap the call itself, not the surrounding expression. Wrong:
--   (SELECT auth.jwt() ->> 'email')
-- Right:
--   (SELECT auth.jwt()) ->> 'email'

DROP POLICY IF EXISTS "events: owner access" ON public.events;
CREATE POLICY "events: owner access" ON public.events
  USING (owner_email = COALESCE((select auth.jwt()) ->> 'email', ''))
  WITH CHECK (owner_email = COALESCE((select auth.jwt()) ->> 'email', ''));

DROP POLICY IF EXISTS "pearloom_guests: via site owner" ON public.pearloom_guests;
CREATE POLICY "pearloom_guests: via site owner" ON public.pearloom_guests
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = pearloom_guests.site_id AND s.creator_email = COALESCE((select auth.jwt()) ->> 'email', '')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = pearloom_guests.site_id AND s.creator_email = COALESCE((select auth.jwt()) ->> 'email', '')));

DROP POLICY IF EXISTS "relationship_graph: site owner" ON public.relationship_graph;
CREATE POLICY "relationship_graph: site owner" ON public.relationship_graph
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = relationship_graph.site_id AND s.creator_email = COALESCE((select auth.jwt()) ->> 'email', '')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = relationship_graph.site_id AND s.creator_email = COALESCE((select auth.jwt()) ->> 'email', '')));

DROP POLICY IF EXISTS "vendor_bookings: owner access" ON public.vendor_bookings;
CREATE POLICY "vendor_bookings: owner access" ON public.vendor_bookings
  USING (owner_email = COALESCE((select auth.jwt()) ->> 'email', ''))
  WITH CHECK (owner_email = COALESCE((select auth.jwt()) ->> 'email', ''));

DROP POLICY IF EXISTS "guest_personalization: site owner" ON public.guest_personalization;
CREATE POLICY "guest_personalization: site owner" ON public.guest_personalization
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = guest_personalization.site_id AND s.creator_email = COALESCE((select auth.jwt()) ->> 'email', '')));

DROP POLICY IF EXISTS "event_director_sessions: owner access" ON public.event_director_sessions;
CREATE POLICY "event_director_sessions: owner access" ON public.event_director_sessions
  USING (owner_email = COALESCE((select auth.jwt()) ->> 'email', ''))
  WITH CHECK (owner_email = COALESCE((select auth.jwt()) ->> 'email', ''));

DROP POLICY IF EXISTS "post_event_films: owner access" ON public.post_event_films;
CREATE POLICY "post_event_films: owner access" ON public.post_event_films
  USING (owner_email = COALESCE((select auth.jwt()) ->> 'email', ''))
  WITH CHECK (owner_email = COALESCE((select auth.jwt()) ->> 'email', ''));

DROP POLICY IF EXISTS "day_of_announcements: site owner write" ON public.day_of_announcements;
CREATE POLICY "day_of_announcements: site owner write" ON public.day_of_announcements
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = day_of_announcements.site_id AND s.creator_email = COALESCE((select auth.jwt()) ->> 'email', '')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = day_of_announcements.site_id AND s.creator_email = COALESCE((select auth.jwt()) ->> 'email', '')));

DROP POLICY IF EXISTS "voice_toasts: owner read" ON public.voice_toasts;
CREATE POLICY "voice_toasts: owner read" ON public.voice_toasts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = voice_toasts.site_id AND s.creator_email = COALESCE((select auth.jwt()) ->> 'email', '')));

DROP POLICY IF EXISTS "guestbook: site owner read" ON public.guestbook;
CREATE POLICY "guestbook: site owner read" ON public.guestbook FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = guestbook.site_id AND (s.creator_email = (select auth.jwt()) ->> 'email' OR s.site_config->>'creator_email' = (select auth.jwt()) ->> 'email')));

DROP POLICY IF EXISTS "site_analytics: owner read" ON public.site_analytics;
CREATE POLICY "site_analytics: owner read" ON public.site_analytics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.subdomain = site_analytics.site_id AND (s.creator_email = (select auth.jwt()) ->> 'email' OR s.site_config->>'creator_email' = (select auth.jwt()) ->> 'email')));
