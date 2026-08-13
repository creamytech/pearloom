-- ─────────────────────────────────────────────────────────────
-- 20260813_site_redirects — managed site addresses (C.6/L22).
--
-- Before this, there was NO way to change a site's address
-- anywhere in the product. Rename now updates sites.subdomain and
-- records the old address here; the public site route 301s old
-- links to the new home, so anything already printed or shared
-- keeps working.
--
-- Chains are collapsed at rename time (every row pointing at the
-- renamed slug is re-pointed at its new name), so lookup is one
-- hop.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.site_redirects (
  old_subdomain text primary key,
  new_subdomain text not null,
  created_at timestamptz not null default now()
);

create index if not exists site_redirects_new_idx
  on public.site_redirects (new_subdomain);

alter table public.site_redirects enable row level security;

-- Belt-and-braces deny-anon (service-role writes only, same as the
-- house pattern).
drop policy if exists "deny-anon site_redirects" on public.site_redirects;
create policy "deny-anon site_redirects" on public.site_redirects
  for all using (false) with check (false);

comment on table public.site_redirects is
  'Old site addresses 301 to their new home (C.6). Written by /api/sites/rename; read by the public site routes on a subdomain miss.';
