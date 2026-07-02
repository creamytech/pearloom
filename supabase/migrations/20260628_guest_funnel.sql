-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260628_guest_funnel.sql
-- RSVP funnel tracking — the two middle stages the Analytics
-- funnel needs beyond Invited + Replied:
--   invite_opened_at  : first time the guest opened their personal
--                       invite link (?g=<passport_token>)
--   reply_started_at  : first time the guest opened/focused the RSVP
--                       form (began a reply, may or may not finish)
-- Both stamped once (idempotent — only set when null) by the public
-- /api/guests/track endpoint. Nullable + additive: zero impact on
-- existing rows or the RSVP write path.
-- ─────────────────────────────────────────────────────────────

alter table public.guests
  add column if not exists invite_opened_at timestamptz,
  add column if not exists reply_started_at timestamptz;
