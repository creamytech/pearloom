-- ─────────────────────────────────────────────────────────────
-- 2026-04-29 · Anniversary rebroadcast log
--
-- Records each daily anniversary cron run so we don't re-send
-- (idempotency) and have a per-site history of how many rebroadcasts
-- have gone out + to how many guests.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.anniversary_log (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  run_date date not null,
  years_ago integer not null,
  recipients_count integer not null default 0,
  emailed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (site_id, run_date)
);

create index if not exists anniversary_log_site_idx on public.anniversary_log (site_id);

alter table public.anniversary_log enable row level security;

drop policy if exists "anniversary_log_deny_anon" on public.anniversary_log;
create policy "anniversary_log_deny_anon"
  on public.anniversary_log as restrictive for all to anon using (false);
