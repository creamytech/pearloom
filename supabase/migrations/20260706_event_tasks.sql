-- ─────────────────────────────────────────────────────────────
-- 20260706_event_tasks.sql — Team + assignable tasks
-- (GRAND-PLAN Phase 3, Pillar 3 — the collaboration home).
--
-- The task board that turns the co-host roster into a real shared
-- workspace: an owner (or a co-host with write access — editor /
-- guest-manager) captures a task toward the event and optionally
-- assigns it to a teammate by email. Viewers read; strangers see
-- nothing. No money, no PII beyond the assignee email (already
-- known to the team via the co-host roster it's drawn from).
--
-- site_id is TEXT (the sites canonical uuid, resolved by the route
-- from a uuid OR subdomain), matching the gift_pledges / registry
-- table shape — the /api layer, not a DB FK, is the site gate.
--
-- Belt-and-braces RLS: restrictive deny-anon (the gift_pledges
-- pattern); all reads/writes flow through /api/tasks via the
-- service-role client, gated by resolveViewerRole (CLAUDE-DESIGN
-- §12).
--
-- APPLIED to prod (project vpwnpxowqflajvqpgvyb) 2026-07-06 via
-- Supabase MCP + recorded in _pearloom_migrations. Idempotent —
-- safe to re-run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.event_tasks (
  id             uuid primary key default gen_random_uuid(),
  site_id        text not null,
  title          text not null,
  detail         text,
  assignee_email text,
  status         text not null default 'open' check (status in ('open','done')),
  due_on         date,
  created_by     text,
  sort_index     integer not null default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists event_tasks_site_idx on public.event_tasks (site_id);

alter table public.event_tasks enable row level security;

drop policy if exists "event_tasks_deny_anon" on public.event_tasks;
create policy "event_tasks_deny_anon"
  on public.event_tasks
  as restrictive
  for all
  to anon
  using (false);
