-- ─────────────────────────────────────────────────────────────
-- 20260702_site_vendors.sql — The Vendor Book
--
-- The host's PRIVATE vendor roster: everyone they've hired (or are
-- considering), what they cost, deposit/balance due dates, and when
-- they arrive on the day. The private counterpart to the public
-- curated directory (public.vendors, 20260428_vendor_directory.sql)
-- — a Book row can optionally link the directory vendor it was
-- booked from via directory_vendor_id.
--
-- Money columns are host-entered cents (a ledger they keep) — no
-- payment processing, no invented figures. site_id is text and
-- stores the site's uuid id, matching vendor_shortlists.site_id.
--
-- Belt-and-braces RLS: restrictive deny-anon; all reads/writes go
-- through the owner-gated service-role route /api/vendors/book
-- (CLAUDE-DESIGN §12).
--
-- NOTE: per CLAUDE-DESIGN §12 this file must ALSO be applied to
-- prod (project vpwnpxowqflajvqpgvyb) via MCP and recorded in
-- _pearloom_migrations. It has NOT been applied automatically —
-- do that at review time, not from this session.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.site_vendors (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  name text not null,
  category text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  cost_cents integer,
  deposit_cents integer,
  deposit_due date,
  balance_due date,
  deposit_paid boolean not null default false,
  balance_paid boolean not null default false,
  status text not null default 'considering'
    check (status in ('considering', 'booked', 'paid')),
  arrival_time text,
  notes text,
  directory_vendor_id uuid references public.vendors(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists site_vendors_site_idx on public.site_vendors (site_id);

alter table public.site_vendors enable row level security;

drop policy if exists "site_vendors_deny_anon" on public.site_vendors;
create policy "site_vendors_deny_anon"
  on public.site_vendors
  as restrictive
  for all
  to anon
  using (false);
