-- ─────────────────────────────────────────────────────────────
-- Crew threads (GRAND-PLAN-2 C.6) — the reserved kind, built.
--
-- 20260708_person_threads.sql reserved kind='crew' but declared
-- person_lo/person_hi NOT NULL — a crew row literally could not
-- exist. This migration:
--   • relaxes lo/hi to nullable with a SHAPE GUARD (pair rows
--     carry both persons; crew rows carry neither — the members
--     live in crew_thread_members). The ordered-pair check and
--     unique(lo,hi) both pass NULLs through, so pair semantics
--     are untouched.
--   • adds title (the crew's name, "Bach weekend crew") and
--     created_by.
--   • adds crew_thread_members(thread_id, person_id) — the
--     membership table every crew read/write is gated on.
--
-- Privacy contract: a crew may only be assembled from the
-- creator's ACCEPTED friends (verified in lib/threads.ts on
-- create); every read/write re-verifies membership. Deny-anon
-- RLS matches every other people-adjacent table.
--
-- APPLIED to prod (vpwnpxowqflajvqpgvyb) via Supabase MCP
-- 2026-07-08 + recorded in _pearloom_migrations. Idempotent.
-- ─────────────────────────────────────────────────────────────

alter table public.person_threads alter column person_lo drop not null;
alter table public.person_threads alter column person_hi drop not null;

alter table public.person_threads
  add column if not exists title text check (char_length(title) <= 80);
alter table public.person_threads
  add column if not exists created_by uuid references public.people(id) on delete set null;

do $$ begin
  alter table public.person_threads add constraint person_threads_kind_shape check (
    (kind = 'pair' and person_lo is not null and person_hi is not null)
    or (kind = 'crew' and person_lo is null and person_hi is null)
  );
exception when duplicate_object then null; end $$;

create table if not exists public.crew_thread_members (
  thread_id  uuid not null references public.person_threads(id) on delete cascade,
  person_id  uuid not null references public.people(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (thread_id, person_id)
);

create index if not exists crew_thread_members_person_idx
  on public.crew_thread_members (person_id);

alter table public.crew_thread_members enable row level security;

drop policy if exists "crew_thread_members_deny_anon" on public.crew_thread_members;
create policy "crew_thread_members_deny_anon"
  on public.crew_thread_members
  as restrictive
  for all
  to anon
  using (false);
