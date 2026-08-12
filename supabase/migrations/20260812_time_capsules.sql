-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260812_time_capsules.sql — Sprint S.1
--
-- The Love Letter Time Capsule (/api/time-capsule +
-- /time-capsule/[token]) has shipped for months against a table
-- that never existed — every write landed in the route's
-- in-memory fallback and evaporated on the next deploy. A guest
-- who sealed a letter to be opened in five years lost it within
-- hours. This creates the durable store the route was written
-- for; the in-memory fallback remains as a keyless-deploy demo
-- path only.
--
-- Shape matches the route's CapsuleRecord exactly. site_id is
-- text (the subdomain-keyed convention of the event-os tables).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.time_capsules (
  id           uuid primary key default gen_random_uuid(),
  site_id      text not null,
  from_name    text not null,
  to_name      text not null,
  letter_text  text not null,
  unlock_date  date not null,
  unlock_years integer not null default 1,
  token        text unique not null,
  delivered    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists time_capsules_site_idx
  on public.time_capsules(site_id);

alter table public.time_capsules enable row level security;

-- Deny anon — reads/writes go through service-role API routes only.
drop policy if exists "time_capsules_deny_anon" on public.time_capsules;
create policy "time_capsules_deny_anon"
  on public.time_capsules
  as restrictive
  for all
  to anon
  using (false);
