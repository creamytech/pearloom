-- ─────────────────────────────────────────────────────────────
-- Circle invite tokens (GRAND-PLAN-2 C.2/C.3) — the personal
-- invite LINK for the friend circle.
--
-- Why a token table: people.email is NOT NULL UNIQUE, so a
-- phone-only invitee cannot be pre-created as a person row the
-- way email invites are (the email-keyed "claim on first
-- sign-in" mechanism). An SMS invite instead mints a token; the
-- invitee signs up with whatever email they like, and CLAIMING
-- the token creates the pending friendship from the inviter —
-- consent unchanged, the invitee still accepts. The same token
-- also powers the tightened accept moment (C.3): arriving via a
-- personal link surfaces a one-tap "Add them back" instead of
-- the buried sealed-envelope step.
--
-- NOT YET APPLIED TO PROD (Supabase MCP re-auth pending as of
-- 2026-07-08) — apply via MCP + record in _pearloom_migrations.
-- All code paths degrade gracefully while the table is absent.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.circle_invites (
  id                 uuid primary key default gen_random_uuid(),
  token              text not null unique,
  inviter_person_id  uuid not null references public.people(id) on delete cascade,
  -- E.164 for SMS invites; lowercase email when the email path
  -- mints a link too. At least one should be present.
  invitee_phone      text,
  invitee_email      text,
  invitee_name       text,
  created_at         timestamptz not null default now(),
  claimed_at         timestamptz,
  claimed_person_id  uuid references public.people(id) on delete set null
);

create index if not exists circle_invites_inviter_idx
  on public.circle_invites (inviter_person_id, created_at desc);

alter table public.circle_invites enable row level security;

drop policy if exists "circle_invites_deny_anon" on public.circle_invites;
create policy "circle_invites_deny_anon"
  on public.circle_invites
  as restrictive
  for all
  to anon
  using (false);
