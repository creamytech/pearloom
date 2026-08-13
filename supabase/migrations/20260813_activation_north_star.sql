-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260813_activation_north_star.sql — the activation
-- funnel upgraded to the AGREED north star (REVAMP D.4, audit L48).
--
-- REVIEW-SYNTHESIS §1.10 (endorsed by all three reviewers) defined
-- activated as: published + 10–20 guests + ≥1 invitation sent +
-- ≥1 guest response. The 2026-07-06 view shipped a weaker bar
-- (published AND ≥1 attending RSVP) with no guest-count threshold
-- and no invitation-sent stage — blind at the single riskiest step.
--
-- This replaces public.activation_funnel with the full ladder:
--
--   signup → onboarded → created → published
--     → guests added (threshold: ≥10, the synthesis's lower bound)
--     → ≥1 invitation sent      (guests.email_sent_at — the Studio
--                                send + nudge paths stamp it)
--     → ≥1 guest response       (guests.responded_at, ANY status —
--                                a decline is a response)
--
--   activated = published ∧ guest_count ≥ 10 ∧ invitation sent
--               ∧ ≥1 response
--
-- `received_first_rsvp` (first ATTENDING reply) stays as a column
-- for continuity with existing dashboards; it is no longer the
-- activation bar. The invite-DELIVERY stage (delivered/bounced from
-- the email webhook) is deliberately absent: it lands with O.1
-- (email DNS + webhook events carry no per-guest delivery stamp
-- until then). Add `first_invite_delivered_at` when O.1 closes.
--
-- SECURITY: same posture as the 2026-07-06 view — deny-anon
-- underneath, anon + authenticated revoked below.
--
-- PENDING prod apply (owner MCP re-auth) — tracked with the other
-- pending applies in docs/REVAMP-EXECUTION-PLAN.md §3.
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────

alter table public.sites
  add column if not exists published_at timestamptz;

-- The stage set changes (new columns mid-select) — create or
-- replace can't reorder/insert columns in a view, so drop first.
drop view if exists public.activation_funnel;

create view public.activation_funnel as
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
guest_stats as (
  select lower(s.creator_email) as email,
         count(*)                as guest_count,
         min(g.email_sent_at)    as first_invite_sent_at,
         min(g.responded_at)     as first_response_at
  from public.guests g
  join public.sites s on s.id = g.site_id
  where s.creator_email is not null
  group by lower(s.creator_email)
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
  coalesce(gs.guest_count, 0) as guest_count,
  gs.first_invite_sent_at,
  gs.first_response_at,
  fr.first_rsvp_at,
  -- Stage flags — the ladder as booleans for easy COUNT/AVG.
  (ob.onboarded_at          is not null) as onboarded,
  (sb.first_site_created_at is not null) as created_site,
  (sb.first_published_at    is not null) as published,
  (coalesce(gs.guest_count, 0) >= 10)    as reached_guest_threshold,
  (gs.first_invite_sent_at  is not null) as sent_invitation,
  (gs.first_response_at     is not null) as received_response,
  (fr.first_rsvp_at         is not null) as received_first_rsvp,
  -- North star (REVIEW-SYNTHESIS §1.10): published + ≥10 guests +
  -- ≥1 invitation sent + ≥1 guest response.
  (sb.first_published_at is not null
     and coalesce(gs.guest_count, 0) >= 10
     and gs.first_invite_sent_at is not null
     and gs.first_response_at    is not null) as activated,
  -- Durations for the funnel charts.
  (sb.first_published_at   - sb.first_site_created_at) as time_to_publish,
  (gs.first_invite_sent_at - sb.first_published_at)    as time_to_first_invite,
  (gs.first_response_at    - gs.first_invite_sent_at)  as time_to_first_response,
  (fr.first_rsvp_at        - sb.first_published_at)    as time_to_first_rsvp,
  -- The metric window: activated within 14 days of signup.
  (sb.first_published_at is not null
     and coalesce(gs.guest_count, 0) >= 10
     and gs.first_invite_sent_at is not null
     and gs.first_response_at    is not null
     and su.signed_up_at         is not null
     and gs.first_response_at <= su.signed_up_at + interval '14 days') as activated_within_14d
from population p
left join signups        su on su.email = p.email
left join onboarded      ob on ob.email = p.email
left join sites_by_owner sb on sb.email = p.email
left join guest_stats    gs on gs.email = p.email
left join first_rsvp     fr on fr.email = p.email;

-- Analytics read is service-role / dashboard only — never anon.
revoke all on public.activation_funnel from anon, authenticated;
