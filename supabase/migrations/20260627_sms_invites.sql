-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260627_sms_invites.sql
--
-- Text-message invites (Twilio). Mirrors the email lifecycle's
-- email_sent_at: /api/guests/text-invite stamps sms_invite_sent_at
-- when a guest's personal link goes out by SMS, so the dashboard
-- can show who's been texted and the bulk sender can skip them.
-- ─────────────────────────────────────────────────────────────

alter table public.guests
  add column if not exists sms_invite_sent_at timestamptz;

comment on column public.guests.sms_invite_sent_at is
  'When the guest''s personal invite link was last sent by SMS (Twilio). Null = never texted.';
