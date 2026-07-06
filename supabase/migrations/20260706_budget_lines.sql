-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260706_budget_lines.sql — the money spine
-- (GRAND-PLAN Phase 0). ONE ledger the whole product plans against.
--
-- Today a site's budget lives as a manifest array
-- (manifest.budget = [{cat, used, cap}] in whole dollars, written by
-- /api/sites/budget). That array stays as a CACHED PROJECTION the
-- cockpit reads; THIS table is the richer source of truth:
--   • cents (never dollars) — no rounding drift.
--   • planned ↔ committed ↔ paid, so "over budget" is a real signal.
--   • kind = expense | income (gifts/contributions coming in).
--   • a REAL vendor link (source_kind='vendor', source_id = the
--     site_vendors.id) — replaces the fragile name-string match in
--     VendorBookClient.addToBudget.
--   • celebration_id + scope: forward-compat for Phase 5, where the
--     budget is promoted from site to celebration scope. Unused now.
--
-- site_id is text and stores the site's uuid, matching
-- site_vendors.site_id / gift_pledges.site_id.
--
-- Belt-and-braces RLS: restrictive deny-anon; all reads/writes go
-- through the owner-gated service-role route (CLAUDE-DESIGN §12).
--
-- NOTE: per CLAUDE-DESIGN §12 this file must ALSO be applied to prod
-- (project vpwnpxowqflajvqpgvyb) via MCP and recorded in
-- _pearloom_migrations. It has NOT been applied automatically — do
-- that at review time, not from this session.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.budget_lines (
  id             uuid primary key default gen_random_uuid(),
  site_id        text not null,
  celebration_id uuid,
  scope          text not null default 'site' check (scope in ('site', 'celebration')),
  category       text not null,
  label          text,
  kind           text not null default 'expense' check (kind in ('expense', 'income')),
  planned_cents  integer,
  committed_cents integer,
  paid_cents     integer,
  source_kind    text check (source_kind is null or source_kind in ('manual', 'vendor', 'expense', 'pledge')),
  source_id      uuid,
  sort_index     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists budget_lines_site_idx on public.budget_lines (site_id);
create index if not exists budget_lines_celebration_idx
  on public.budget_lines (celebration_id) where celebration_id is not null;

-- One vendor-linked line per (site, vendor): re-adding a vendor to the
-- budget UPDATES the line in place rather than duplicating it. This is
-- the real FK that kills the name-string merge.
create unique index if not exists budget_lines_site_vendor_uidx
  on public.budget_lines (site_id, source_id)
  where source_kind = 'vendor' and source_id is not null;

alter table public.budget_lines enable row level security;
drop policy if exists "budget_lines_deny_anon" on public.budget_lines;
create policy "budget_lines_deny_anon"
  on public.budget_lines as restrictive for all to anon using (false);
