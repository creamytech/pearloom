-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260425_guest_passport.sql
--
-- Infrastructure for the "guest ⇄ host" bridge features layered on
-- top of the existing `pearloom_guests` table (which already has
-- `guest_token` from 20260416_event_os.sql):
--   • Memory Weave              — per-guest story prompts + responses
--   • Live Whispers             — private notes, delivered over time
--   • Anniversary Time-Capsule  — sealed notes revealed on a given year
--   • Collaborative Playlist    — guest song submissions
--   • Seat-mate Introductions   — per-guest seat + table cache
--   • Pear SMS drafts           — one-per-guest personalized SMS text
--
-- Every table follows the belt-and-braces pattern: RLS on, restrictive
-- deny-anon policy; writes go through service-role API routes only.
-- ─────────────────────────────────────────────────────────────

-- Ensure pearloom_guests exists (from 20260416_event_os.sql) before
-- anything below references it. The full table definition lives there;
-- this migration only adds dependents.

-- ── Memory prompts ──────────────────────────────────────────
create table if not exists public.memory_prompts (
  id            uuid primary key default gen_random_uuid(),
  site_id       text not null,
  guest_id      uuid references public.pearloom_guests(id) on delete cascade,
  guest_name    text not null,
  prompt        text not null,
  response      text,
  responded_at  timestamptz,
  used_in_toast boolean default false,
  used_in_reel  boolean default false,
  created_at    timestamptz not null default now()
);

create index if not exists memory_prompts_site_idx
  on public.memory_prompts(site_id, created_at desc);

create index if not exists memory_prompts_guest_idx
  on public.memory_prompts(guest_id);

alter table public.memory_prompts enable row level security;
drop policy if exists "memory_prompts_deny_anon" on public.memory_prompts;
create policy "memory_prompts_deny_anon"
  on public.memory_prompts
  as restrictive
  for all
  to anon
  using (false);

-- ── Live Whispers ───────────────────────────────────────────
create table if not exists public.whispers (
  id            uuid primary key default gen_random_uuid(),
  site_id       text not null,
  guest_id      uuid references public.pearloom_guests(id) on delete cascade,
  guest_name    text not null,
  body          text not null check (char_length(body) between 1 and 1500),
  is_private    boolean not null default true,
  deliver_after timestamptz not null default now(),
  delivered_at  timestamptz,
  read_by_host  boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists whispers_site_idx
  on public.whispers(site_id, deliver_after desc);

alter table public.whispers enable row level security;
drop policy if exists "whispers_deny_anon" on public.whispers;
create policy "whispers_deny_anon"
  on public.whispers
  as restrictive
  for all
  to anon
  using (false);

-- ── Anniversary Time-Capsule ────────────────────────────────
create table if not exists public.time_capsule (
  id            uuid primary key default gen_random_uuid(),
  site_id       text not null,
  guest_id      uuid references public.pearloom_guests(id) on delete cascade,
  guest_name    text not null,
  body          text not null check (char_length(body) between 1 and 2000),
  reveal_years  integer not null check (reveal_years between 1 and 50),
  reveal_on     date not null,
  revealed      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists time_capsule_site_idx
  on public.time_capsule(site_id, reveal_on);

alter table public.time_capsule enable row level security;
drop policy if exists "time_capsule_deny_anon" on public.time_capsule;
create policy "time_capsule_deny_anon"
  on public.time_capsule
  as restrictive
  for all
  to anon
  using (false);

-- ── Collaborative Playlist ──────────────────────────────────
create table if not exists public.song_requests (
  id          uuid primary key default gen_random_uuid(),
  site_id     text not null,
  guest_id    uuid references public.pearloom_guests(id) on delete cascade,
  guest_name  text not null,
  song_title  text not null check (char_length(song_title) between 1 and 120),
  artist      text check (char_length(artist) between 1 and 120),
  spotify_url text,
  note        text,
  state       text not null default 'queued' check (state in ('queued', 'accepted', 'hidden')),
  created_at  timestamptz not null default now()
);

create index if not exists song_requests_site_idx
  on public.song_requests(site_id, created_at desc);

alter table public.song_requests enable row level security;
drop policy if exists "song_requests_deny_anon" on public.song_requests;
create policy "song_requests_deny_anon"
  on public.song_requests
  as restrictive
  for all
  to anon
  using (false);

-- ── Seat-mate cache (per-guest intro sentences) ─────────────
create table if not exists public.seatmate_intros (
  id          uuid primary key default gen_random_uuid(),
  site_id     text not null,
  guest_id    uuid references public.pearloom_guests(id) on delete cascade,
  table_label text,
  intro       text not null,
  seatmates   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  unique (guest_id)
);

alter table public.seatmate_intros enable row level security;
drop policy if exists "seatmate_intros_deny_anon" on public.seatmate_intros;
create policy "seatmate_intros_deny_anon"
  on public.seatmate_intros
  as restrictive
  for all
  to anon
  using (false);

-- ── Pear SMS drafts (one per guest, regenerated on demand) ──
create table if not exists public.pear_sms_drafts (
  id          uuid primary key default gen_random_uuid(),
  site_id     text not null,
  guest_id    uuid references public.pearloom_guests(id) on delete cascade,
  guest_name  text not null,
  body        text not null check (char_length(body) between 1 and 320),
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (guest_id)
);

alter table public.pear_sms_drafts enable row level security;
drop policy if exists "pear_sms_drafts_deny_anon" on public.pear_sms_drafts;
create policy "pear_sms_drafts_deny_anon"
  on public.pear_sms_drafts
  as restrictive
  for all
  to anon
  using (false);
