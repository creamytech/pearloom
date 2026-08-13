-- ─────────────────────────────────────────────────────────────
-- Day-of broadcast emails
--
-- Adds email_broadcast_at + email_recipient_count to live_updates
-- so each post tracks whether it was fanned out to guest inboxes
-- (host-opted) and how many recipients it reached.
--
-- The default (NULL) means the post lived on-site only — same
-- behavior as today's BroadcastBar 30s polling. When the host
-- ticks "Also email everyone" in the composer, the API fans out
-- to RSVP'd guests with email and stamps email_broadcast_at +
-- email_recipient_count for the audit trail.
-- ─────────────────────────────────────────────────────────────

alter table public.live_updates
  add column if not exists email_broadcast_at timestamptz;

alter table public.live_updates
  add column if not exists email_recipient_count integer;

-- Helps the rate-limit query "how many email broadcasts has this
-- site posted in the last 24h?" without scanning the whole table.
create index if not exists live_updates_email_broadcast_idx
  on public.live_updates(subdomain, email_broadcast_at desc)
  where email_broadcast_at is not null;
