-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260706_activation_view.sql — the activation funnel
-- computed from EXISTING data (GRAND-PLAN Pillar 20, step 3).
--
-- One SQL view over the tables we already keep — welcome_emails
-- (signup), user_preferences.onboarded_at (welcome done),
-- sites.created_at / sites.published_at (site created / published),
-- guests.status + guests.responded_at (first attending RSVP) —
-- yields the whole host funnel with zero new instrumentation:
--
--   signup → onboarded → created → published → first-RSVP
--   + time-to-publish + time-to-first-RSVP + activated(-within-14d).
--
-- Keyed by lowercased email. The population is every email that
-- appears in welcome_emails OR user_preferences OR sites.creator_email
-- (a UNION, so owners who predate welcome_emails aren't dropped);
-- signed_up_at is welcome_emails.sent_at (null for pre-tracking
-- owners). guests.site_id is the sites.id UUID (the RSVP write path
-- resolves slug → uuid before insert), joined back to its owner.
--
-- SECURITY: the underlying tables are all deny-anon; this view is a
-- service-role / dashboard read only, so anon + authenticated are
-- revoked below (a view runs with its owner's table privileges by
-- default, so an accidental anon grant would leak the whole funnel).
--
-- APPLIED to prod (project vpwnpxowqflajvqpgvyb) 2026-07-06 via
-- Supabase MCP + recorded in _pearloom_migrations. Idempotent —
-- safe to re-run.
-- ─────────────────────────────────────────────────────────────

-- Defensive: the funnel references sites.published_at (added by
-- 20260706_product_events.sql). Re-declare it idempotently so this
-- view creates cleanly regardless of migration apply order.
alter table public.sites
  add column if not exists published_at timestamptz;

create or replace view public.activation_funnel as
with signups as (
  select lower(email) as email, min(sent_at) as signed_up_at
  from public.welcome_emails
  group by lower(email)
),
onboarded as (
  select lower(email) as email, min(onboarded_at) as onboarded_at
  from public.user_preferences
  where onboarded_at is not null
  group by lower(email)
),
sites_by_owner as (
  select lower(creator_email) as email,
         min(created_at)   as first_site_created_at,
         min(published_at) as first_published_at
  from public.sites
  where creator_email is not null and length(trim(creator_email)) > 0
  group by lower(creator_email)
),
first_rsvp as (
  select lower(s.creator_email) as email,
         min(g.responded_at) as first_rsvp_at
  from public.guests g
  join public.sites s on s.id = g.site_id
  where lower(coalesce(g.status, '')) = 'attending'
    and g.responded_at is not null
    and s.creator_email is not null
  group by lower(s.creator_email)
),
population as (
  select email from signups
  union
  select email from onboarded
  union
  select email from sites_by_owner
)
select
  p.email,
  su.signed_up_at,
  ob.onboarded_at,
  sb.first_site_created_at,
  sb.first_published_at,
  fr.first_rsvp_at,
  -- Stage flags — the funnel steps as booleans for easy COUNT/AVG.
  (ob.onboarded_at          is not null) as onboarded,
  (sb.first_site_created_at is not null) as created_site,
  (sb.first_published_at    is not null) as published,
  (fr.first_rsvp_at         is not null) as received_first_rsvp,
  -- North-star: activated = published AND ≥1 attending RSVP.
  (sb.first_published_at is not null and fr.first_rsvp_at is not null) as activated,
  -- Durations for the time-to-publish / time-to-first-RSVP charts.
  (sb.first_published_at - sb.first_site_created_at) as time_to_publish,
  (fr.first_rsvp_at       - sb.first_published_at)   as time_to_first_rsvp,
  -- North-star metric window: activated within 14 days of signup.
  (sb.first_published_at is not null
     and fr.first_rsvp_at is not null
     and su.signed_up_at is not null
     and fr.first_rsvp_at <= su.signed_up_at + interval '14 days') as activated_within_14d
from population p
left join signups        su on su.email = p.email
left join onboarded      ob on ob.email = p.email
left join sites_by_owner sb on sb.email = p.email
left join first_rsvp     fr on fr.email = p.email;

-- Analytics read is service-role / dashboard only — never anon.
revoke all on public.activation_funnel from anon, authenticated;
