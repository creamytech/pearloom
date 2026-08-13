-- ─────────────────────────────────────────────────────────────
-- 20260706_friendships.sql — GRAND-PLAN Phase 4, the Social layer.
--
-- A LIGHT friend layer on the event graph — NOT a social network
-- (CLAUDE-PRODUCT's deliberate stance). It sits on top of the
-- existing opt-in "people you've celebrated with" base (people
-- table + connections_opt_in, 20260621/20260622). Two people who
-- keep crossing paths at each other's celebrations can, if they
-- both choose to, keep a first-names-only connection.
--
--   • friendships — one directed request row per (requester,
--     addressee) pair. 'pending' until the addressee accepts or
--     declines. A mutual pending (each requested the other)
--     resolves to 'accepted' by the app layer (src/lib/friends.ts
--     requestFriend). Consent is the request→accept handshake; the
--     unique index makes a pair single-rowed per direction.
--
-- Privacy posture (mirrors the connections contract, do not loosen):
--   • Nothing here exposes an email or a last name. Reads surface
--     first names only, via public.people.display_name.
--   • Everything is opt-in: a friend request can only be SENT to a
--     person who is already a mutual-opt-in "familiar face" (both
--     connections_opt_in = true and a shared celebration), enforced
--     in /api/guest/friends. Off by default, everywhere.
--   • Belt-and-braces RLS: restrictive deny-anon; all reads/writes
--     go through the token-authed guest API / owner-gated host route
--     via the service-role client (CLAUDE-DESIGN §12), exactly like
--     gift_pledges / activity_votes.
--
-- APPLIED to prod (project vpwnpxowqflajvqpgvyb) 2026-07-06 via
-- Supabase MCP + recorded in _pearloom_migrations. Idempotent —
-- safe to re-run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.friendships (
  id                   uuid primary key default gen_random_uuid(),
  requester_person_id  uuid not null references public.people(id) on delete cascade,
  addressee_person_id  uuid not null references public.people(id) on delete cascade,
  status               text not null default 'pending'
                         check (status in ('pending', 'accepted', 'declined')),
  created_at           timestamptz default now(),
  responded_at         timestamptz,
  -- No self-friendship (belt-and-braces; the app layer refuses too).
  constraint friendships_no_self check (requester_person_id <> addressee_person_id),
  -- One directed row per pair; the app layer collapses a mutual
  -- pending into a single 'accepted'.
  unique (requester_person_id, addressee_person_id)
);

create index if not exists friendships_requester_idx on public.friendships (requester_person_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_person_id);
create index if not exists friendships_status_idx    on public.friendships (status);

alter table public.friendships enable row level security;

drop policy if exists "friendships_deny_anon" on public.friendships;
create policy "friendships_deny_anon"
  on public.friendships
  as restrictive
  for all
  to anon
  using (false);
