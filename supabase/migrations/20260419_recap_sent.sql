-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260419_recap_sent.sql
-- Guard against double-sending the day-after recap email.
-- ─────────────────────────────────────────────────────────────

alter table if exists public.sites
  add column if not exists recap_sent_at timestamptz;

create index if not exists sites_recap_pending_idx
  on public.sites (published, recap_sent_at)
  where published = true and recap_sent_at is null;
