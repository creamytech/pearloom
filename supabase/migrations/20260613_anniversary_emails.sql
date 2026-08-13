-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260613_anniversary_emails.sql
-- Per-site email opt-out + idempotency log for the anniversary
-- cron (api/cron/anniversary).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.site_email_prefs (
  site_id      uuid not null references public.sites(id) on delete cascade,
  channel      text not null check (channel in ('anniversary', 'milestone', 'product')),
  opted_out_at timestamptz,
  primary key (site_id, channel)
);

alter table public.site_email_prefs enable row level security;
drop policy if exists "site_email_prefs_deny_anon" on public.site_email_prefs;
create policy "site_email_prefs_deny_anon"
  on public.site_email_prefs as restrictive for all to anon using (false);

create table if not exists public.anniversary_email_log (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  year        integer not null,
  channel     text not null,
  sent_at     timestamptz not null default now(),
  unique (site_id, year, channel)
);

alter table public.anniversary_email_log enable row level security;
drop policy if exists "anniv_log_deny_anon" on public.anniversary_email_log;
create policy "anniv_log_deny_anon"
  on public.anniversary_email_log as restrictive for all to anon using (false);
