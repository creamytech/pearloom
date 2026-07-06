-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260706_celebrations.sql — the Celebration Model
-- (GRAND-PLAN Phase 5, foundation).
--
-- Today a "celebration" (the weekend/arc a set of sibling sites
-- belong to) is a SHARED STRING: manifest.celebration.{id,name},
-- matched by equality across sites. That string works but can't be
-- a scope for anything — no shared roster, no celebration-level
-- budget, no per-celebration pricing, and the siblings match is a
-- full-table JSONB scan.
--
-- This promotes it to a first-class row:
--   • celebrations        — one row per weekend/arc (owner, name).
--     legacy_id keeps the old manifest.celebration.id string so the
--     backfill + any lingering string reader still resolve.
--   • sites.celebration_id — the real FK (indexed), replacing the
--     string match going forward. manifest.celebration stays as a
--     cached projection (like manifest.budget), so nothing breaks.
--
-- Belt-and-braces RLS: restrictive deny-anon; reads/writes go through
-- the owner-gated service-role routes (CLAUDE-DESIGN §12).
--
-- Backfill is tiny + idempotent (guarded on NULL / on-conflict).
--
-- APPLIED to prod (project vpwnpxowqflajvqpgvyb) 2026-07-06 via
-- Supabase MCP + recorded in _pearloom_migrations. Idempotent —
-- safe to re-run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.celebrations (
  id          uuid primary key default gen_random_uuid(),
  owner_email text,
  name        text not null,
  -- The pre-table manifest.celebration.id string, so the backfill and
  -- any string-era reader resolve to this row. Unique so re-running
  -- the backfill can't duplicate a celebration.
  legacy_id   text unique,
  created_at  timestamptz not null default now()
);

alter table public.sites
  add column if not exists celebration_id uuid references public.celebrations(id) on delete set null;
create index if not exists sites_celebration_id_idx on public.sites (celebration_id);

alter table public.celebrations enable row level security;
drop policy if exists "celebrations_deny_anon" on public.celebrations;
create policy "celebrations_deny_anon"
  on public.celebrations as restrictive for all to anon using (false);

-- ── Backfill — one celebration per distinct legacy id, then link. ──
insert into public.celebrations (name, legacy_id, owner_email)
select distinct on (ai_manifest->'celebration'->>'id')
       coalesce(nullif(ai_manifest->'celebration'->>'name', ''), 'Our celebration'),
       ai_manifest->'celebration'->>'id',
       lower(nullif(trim(creator_email), ''))
from public.sites
where ai_manifest->'celebration'->>'id' is not null
order by ai_manifest->'celebration'->>'id', created_at asc
on conflict (legacy_id) do nothing;

update public.sites s
set celebration_id = c.id
from public.celebrations c
where c.legacy_id = s.ai_manifest->'celebration'->>'id'
  and s.celebration_id is null;
