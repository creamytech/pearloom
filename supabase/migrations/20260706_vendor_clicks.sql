-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260706_vendor_clicks.sql — the affiliate primitive
--
-- The vendor directory (20260428_vendor_directory.sql) promised
-- "affiliate revenue tracked when a host clicks the booking link"
-- but never recorded a single click. This is that log — money-free,
-- no Connect, no processing: just the lead event that a partner
-- payout (or a "most-clicked vendors" insight) can later be built on.
--
-- One row per host tap of a directory vendor's booking / website
-- link. email + site_id are best-effort context (the directory is
-- public; a signed-in host carries both). target = which link.
--
-- Belt-and-braces RLS: restrictive deny-anon; writes go through the
-- rate-limited service-role route /api/vendors/click.
--
-- NOTE: per CLAUDE-DESIGN §12 this file must ALSO be applied to prod
-- (project vpwnpxowqflajvqpgvyb) via MCP and recorded in
-- _pearloom_migrations. It has NOT been applied automatically — do
-- that at review time, not from this session.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.vendor_clicks (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid references public.vendors(id) on delete cascade,
  site_id    text,
  email      text,
  target     text check (target is null or target in ('booking', 'website')),
  created_at timestamptz not null default now()
);

create index if not exists vendor_clicks_vendor_idx
  on public.vendor_clicks (vendor_id, created_at desc);

alter table public.vendor_clicks enable row level security;
drop policy if exists "vendor_clicks_deny_anon" on public.vendor_clicks;
create policy "vendor_clicks_deny_anon"
  on public.vendor_clicks as restrictive for all to anon using (false);
