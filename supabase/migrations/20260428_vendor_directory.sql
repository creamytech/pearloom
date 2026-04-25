-- ─────────────────────────────────────────────────────────────
-- 2026-04-28 · Vendor directory + bookings
--
-- A simple curated directory of wedding/event vendors filterable
-- by category, region, palette compatibility, vibe. Hosts can save
-- vendors to their site's shortlist; affiliate revenue tracked when
-- a host clicks the booking link.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,                 -- 'florist'|'caterer'|'photographer'|'dj'|'planner'|'venue'|...
  region text,                             -- e.g. 'NYC', 'PNW', 'IT-Tuscany'
  palettes text[] default array[]::text[], -- 'cream-sage', 'warm-linen', etc.
  vibes text[] default array[]::text[],    -- 'editorial', 'playful', etc.
  description text,
  hero_image_url text,
  portfolio_urls text[] default array[]::text[],
  website_url text,
  booking_url text,
  contact_email text,
  contact_phone text,
  price_band text,                         -- '$', '$$', '$$$', '$$$$'
  rating numeric(2, 1),
  review_count integer default 0,
  featured boolean default false,
  active boolean default true,
  created_at timestamptz not null default now()
);

create index if not exists vendors_category_idx on public.vendors (category);
create index if not exists vendors_region_idx on public.vendors (region);
create index if not exists vendors_active_idx on public.vendors (active);

alter table public.vendors enable row level security;

-- Vendors are public-readable; only service role writes.
drop policy if exists "vendors_select_anon" on public.vendors;
create policy "vendors_select_anon"
  on public.vendors for select to anon using (active = true);
drop policy if exists "vendors_select_auth" on public.vendors;
create policy "vendors_select_auth"
  on public.vendors for select to authenticated using (active = true);

-- Vendor shortlists per site.
create table if not exists public.vendor_shortlists (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  user_email text not null,
  status text not null default 'considering',  -- 'considering'|'contacted'|'booked'|'declined'
  notes text,
  created_at timestamptz not null default now(),
  unique (site_id, vendor_id)
);

create index if not exists vendor_shortlists_site_idx on public.vendor_shortlists (site_id);

alter table public.vendor_shortlists enable row level security;

drop policy if exists "vendor_shortlists_deny_anon" on public.vendor_shortlists;
create policy "vendor_shortlists_deny_anon"
  on public.vendor_shortlists as restrictive for all to anon using (false);
