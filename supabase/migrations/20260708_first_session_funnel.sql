-- ─────────────────────────────────────────────────────────────
-- The glass box (PERSONA-PLAN S8) — one honest view over the
-- product_events spine so each sprint (and each mass-testing
-- session) can be compared before/after: first-session funnel
-- counts by day, plus the whisper + client-error feeds.
--
-- Views only — no new tables, no RLS changes (product_events is
-- already deny-anon / service-role-only; views inherit access
-- through the querying role).
--
-- APPLIED to prod (vpwnpxowqflajvqpgvyb) via MCP 2026-07-08 and
-- recorded in _pearloom_migrations. See the companion
-- 20260708_funnel_views_invoker.sql — the advisor flagged these
-- as SECURITY DEFINER; security_invoker + revokes fix that.
-- ─────────────────────────────────────────────────────────────

-- Daily funnel: how many distinct actors hit each step. Client
-- beacons are anonymous pre-signup, so the actor key falls back
-- to site, then to the event row itself (counted once).
create or replace view public.first_session_funnel as
select
  date_trunc('day', created_at)::date as day,
  event,
  count(*)                            as events,
  count(distinct coalesce(email, site_id, id::text)) as actors
from public.product_events
where event in (
  'landing_cta', 'wizard_started', 'wizard_step',
  'wizard_weave_clicked', 'wizard_claim_handoff', 'wizard_press_resumed',
  'signed_up', 'welcome_completed', 'site_created',
  'editor_first_edit', 'site_published',
  'publish_link_copied', 'publish_share', 'publish_invite_guests',
  'first_rsvp_received'
)
group by 1, 2
order by 1 desc, 2;

-- The whispers — in-product feedback, newest first. Read this
-- during every testing session.
create or replace view public.whispers_feed as
select
  created_at,
  email,
  props ->> 'route' as route,
  props ->> 'text'  as text
from public.product_events
where event = 'whisper'
order by created_at desc;

-- Client errors — grouped so one crashing page reads as one row.
create or replace view public.client_errors_feed as
select
  max(created_at)      as last_seen,
  count(*)             as occurrences,
  props ->> 'route'    as route,
  props ->> 'kind'     as kind,
  props ->> 'message'  as message
from public.product_events
where event = 'client_error'
group by 3, 4, 5
order by 1 desc;
