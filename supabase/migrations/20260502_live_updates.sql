-- ─────────────────────────────────────────────────────────────
-- Pearloom · 2026-05-02 · live_updates
--
-- Day-of live feed for published wedding sites. The host posts
-- short messages ("Ceremony starting!", "Cocktail hour now in
-- the courtyard") that surface in the LiveUpdatesFeed block on
-- /sites/{subdomain} for guests already on the page.
--
-- The schema lived as a comment block in
-- src/app/api/sites/live-updates/route.ts but was never committed
-- as a migration — production deployments threw PGRST205 ("Could
-- not find the table public.live_updates") on every fetch. This
-- file makes the table real.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.live_updates (
  id uuid default gen_random_uuid() primary key,
  subdomain text not null,
  message text not null,
  photo_url text,
  type text default 'misc' check (type in ('ceremony', 'reception', 'cocktail', 'misc')),
  created_at timestamptz default now()
);

create index if not exists live_updates_subdomain_created_at_idx
  on public.live_updates (subdomain, created_at desc);

-- Belt-and-braces RLS. The route is service-role + authenticated
-- but a restrictive deny-anon policy means even a leaked anon key
-- can't read or write. Hosts post via /api/sites/live-updates
-- (server-side service-role client); guests read via the same
-- endpoint which uses the service-role client too.
alter table public.live_updates enable row level security;

drop policy if exists "live_updates_deny_anon" on public.live_updates;
create policy "live_updates_deny_anon"
  on public.live_updates
  as restrictive
  for all
  to anon
  using (false);
