-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260706_group_split.sql — THE KEYSTONE
-- (GRAND-PLAN Phase 1). The collaborative split: the group shares
-- the cost of a bachelor trip / reunion / group birthday, and
-- Pearloom shows who owes whom — without ever touching the money
-- (settle-up rides the hosts' own P2P handles, like the registry).
--
-- Three tables, the missing primitive the whole money vision hangs
-- on (§7 "the one keystone"):
--   • participants   — the payer/ower unit, anchored to people.id
--     (the cross-event identity) when known; email-optional,
--     name-only allowed (upgrades to a person on RSVP).
--   • expenses       — something one participant paid on behalf of
--     the group (amount, split mode).
--   • expense_shares — each participant's slice of an expense (the
--     ower side). Σ share_cents == expenses.amount_cents (the route
--     enforces; rounding remainder lands on the payer).
--
-- Balances + settle-up are DERIVED (src/lib/budget/split.ts), never
-- stored — no ledger drift. site_id is text holding the site uuid;
-- celebration_id/scope forward-compat for Phase 5.
--
-- Belt-and-braces RLS: restrictive deny-anon; reads/writes go through
-- the token-authed (guest) / owner-gated (host) service-role routes
-- (CLAUDE-DESIGN §12), mirroring the activity_votes / gift_pledges
-- guest-write pattern.
--
-- APPLIED to prod (project vpwnpxowqflajvqpgvyb) 2026-07-06 via
-- Supabase MCP + recorded in _pearloom_migrations. Idempotent —
-- safe to re-run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.participants (
  id             uuid primary key default gen_random_uuid(),
  site_id        text not null,
  celebration_id uuid,
  person_id      uuid references public.people(id) on delete set null,
  display_name   text not null,
  email          text,
  created_at     timestamptz not null default now()
);
create index if not exists participants_site_idx on public.participants (site_id);
create index if not exists participants_person_idx on public.participants (person_id);
-- Dedup a known identity within one site (name-only participants can repeat).
create unique index if not exists participants_site_person_uidx
  on public.participants (site_id, person_id) where person_id is not null;

create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  site_id         text not null,
  celebration_id  uuid,
  payer_id        uuid not null references public.participants(id) on delete cascade,
  description     text not null,
  amount_cents    integer not null check (amount_cents >= 0),
  currency        text not null default 'usd',
  split_mode      text not null default 'even' check (split_mode in ('even', 'shares', 'custom', 'exclude')),
  spent_on        date,
  created_by_email text,
  created_at      timestamptz not null default now()
);
create index if not exists expenses_site_idx on public.expenses (site_id);
create index if not exists expenses_payer_idx on public.expenses (payer_id);

create table if not exists public.expense_shares (
  id             uuid primary key default gen_random_uuid(),
  expense_id     uuid not null references public.expenses(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  share_cents    integer not null default 0 check (share_cents >= 0),
  weight         numeric,
  created_at     timestamptz not null default now(),
  unique (expense_id, participant_id)
);
create index if not exists expense_shares_expense_idx on public.expense_shares (expense_id);
create index if not exists expense_shares_participant_idx on public.expense_shares (participant_id);

alter table public.participants   enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_shares enable row level security;

drop policy if exists "participants_deny_anon" on public.participants;
create policy "participants_deny_anon"
  on public.participants as restrictive for all to anon using (false);
drop policy if exists "expenses_deny_anon" on public.expenses;
create policy "expenses_deny_anon"
  on public.expenses as restrictive for all to anon using (false);
drop policy if exists "expense_shares_deny_anon" on public.expense_shares;
create policy "expense_shares_deny_anon"
  on public.expense_shares as restrictive for all to anon using (false);
