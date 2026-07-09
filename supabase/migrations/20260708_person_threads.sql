-- ─────────────────────────────────────────────────────────────
-- 20260708_person_threads.sql — SOCIAL-PLAN Phase S2: Threads,
-- conversation beyond the event.
--
-- site_messages (20260622) is deliberately EVENT-scoped (party
-- thread + host↔guest DM). This adds the person-pair thread: two
-- MUTUAL CONNECTIONS (an accepted friendship) can hold one bounded
-- 1:1 conversation that persists between celebrations.
--
--   • person_threads  — one row per pair, keyed (person_lo,
--     person_hi) with lo < hi enforced so a pair can never fork
--     into two threads. `kind` ships as 'pair'; 'crew' is reserved
--     for the celebration planning-group thread (schema-ready,
--     shipped later with a members table).
--   • person_messages — the bounded conversation. `hidden_at` =
--     sender-side retraction (moderation parity with the host
--     thread's hide).
--
-- Privacy posture (the friendships contract, do not loosen):
--   • A thread may only exist between an ACCEPTED pair — enforced
--     in src/lib/threads.ts before any write; there is no
--     discovery surface, no global inbox of strangers.
--   • First names only cross the wire; bodies are the pair's own
--     words to each other.
--   • Belt-and-braces RLS: restrictive deny-anon; all access via
--     the session-authed API through the service-role client
--     (CLAUDE-DESIGN §12).
--
-- APPLIED to prod (project vpwnpxowqflajvqpgvyb) 2026-07-08 via
-- Supabase MCP + recorded in _pearloom_migrations. Idempotent.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.person_threads (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'pair' check (kind in ('pair', 'crew')),
  person_lo   uuid not null references public.people(id) on delete cascade,
  person_hi   uuid not null references public.people(id) on delete cascade,
  created_at  timestamptz default now(),
  -- Canonical ordering — one thread per pair, never two.
  constraint person_threads_ordered check (person_lo < person_hi),
  unique (person_lo, person_hi)
);

create index if not exists person_threads_lo_idx on public.person_threads (person_lo);
create index if not exists person_threads_hi_idx on public.person_threads (person_hi);

create table if not exists public.person_messages (
  id                uuid primary key default gen_random_uuid(),
  thread_id         uuid not null references public.person_threads(id) on delete cascade,
  sender_person_id  uuid not null references public.people(id) on delete cascade,
  body              text not null check (char_length(body) between 1 and 4000),
  created_at        timestamptz default now(),
  hidden_at         timestamptz
);

create index if not exists person_messages_thread_idx
  on public.person_messages (thread_id, created_at desc);

alter table public.person_threads  enable row level security;
alter table public.person_messages enable row level security;

drop policy if exists "person_threads_deny_anon" on public.person_threads;
create policy "person_threads_deny_anon"
  on public.person_threads
  as restrictive
  for all
  to anon
  using (false);

drop policy if exists "person_messages_deny_anon" on public.person_messages;
create policy "person_messages_deny_anon"
  on public.person_messages
  as restrictive
  for all
  to anon
  using (false);
