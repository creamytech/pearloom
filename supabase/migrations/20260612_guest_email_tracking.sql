-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260612_guest_email_tracking.sql
-- Email lifecycle timestamps on guests rows.
--
-- Resend webhook (/api/webhooks/resend) writes these as events
-- arrive: email.delivered → email_delivered_at, email.opened →
-- email_opened_at, etc. Pearloom send paths set email_sent_at
-- when they fire the message; the rest is webhook-driven.
--
-- Surfaces:
--   • DashGuests row timeline pips (sent → delivered → opened)
--   • The "X guests opened the invite but haven't replied"
--     nudge above the dashboard table
--   • Bounced rows surface as terra ⚠ "wrong address?" so the
--     host can fix typos before sending again
-- ─────────────────────────────────────────────────────────────

alter table public.guests
  add column if not exists email_sent_at      timestamptz,
  add column if not exists email_delivered_at timestamptz,
  add column if not exists email_opened_at    timestamptz,
  add column if not exists email_clicked_at   timestamptz,
  add column if not exists email_bounced_at   timestamptz;

-- "Opened the invite but didn't reply" — the actionable nudge
-- bucket. Indexed so the dashboard query is cheap even on large
-- guest lists.
create index if not exists guests_email_opened_pending_idx
  on public.guests (site_id, email_opened_at)
  where email_opened_at is not null and responded_at is null;
