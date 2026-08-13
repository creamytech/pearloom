-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260611_registry_link_claims.sql
-- Claim records for link-out registry entries.
--
-- Distinct from `registry_items` (the native Stripe-checkout
-- flow). Link-out entries live on the manifest as URL pointers;
-- this table stores per-(site_id, entry_url) claims so:
--   • the public registry can show "Linda Chen got this" pills
--     on cards a guest already claimed (prevents doubles)
--   • the host dashboard can surface a thank-you feed
--   • claims survive manifest republishes — they're keyed by
--     entry URL, not the rotating manifest blob
--
-- Insert path: POST /api/registry-link-claims with site_id,
-- entry_url, claimer_name, claimer_email. Service-role key only;
-- anon visitors hit through the API which validates + inserts.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.registry_link_claims (
  id              uuid primary key default gen_random_uuid(),
  -- Site UUID — same `sites.id` referenced by the legacy guests
  -- table. Cascade so deleting a site sweeps its claims.
  site_id         uuid not null references public.sites(id) on delete cascade,
  -- The entry URL the claim points at. We key by URL because the
  -- manifest's registry entries don't have stable ids — host edits
  -- can re-order or rename them, but the URL is the identity.
  entry_url       text not null,
  -- Who claimed it. Email is required for thank-you pipelines;
  -- name is optional (some guests skip the field).
  claimer_email   text not null,
  claimer_name    text,
  -- Optional note ("From the Patel family — congratulations!")
  message         text,
  -- Optional quantity in case a host marked the item as
  -- multi-claim (e.g. 4 wine glasses). Defaults to 1; the
  -- public renderer aggregates these for "2 of 4 claimed".
  quantity        integer not null default 1 check (quantity > 0),
  -- When the host says "actually no, I ungifted that" this stays
  -- around but flagged so analytics aren't lost. Most flows only
  -- query rows where revoked_at is null.
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- Public-renderer query: "all current claims for this site so I
-- can show the pills." (site_id, revoked_at IS NULL, ordered).
create index if not exists registry_link_claims_site_idx
  on public.registry_link_claims (site_id, created_at desc)
  where revoked_at is null;

-- Per-URL aggregation — the renderer counts claims per entry to
-- decide whether to show a single name or "+ 2 more".
create index if not exists registry_link_claims_url_idx
  on public.registry_link_claims (site_id, entry_url)
  where revoked_at is null;

-- Owner dashboard query — "all claims with their attribution",
-- but written via service-role API. Anon read should be denied
-- (claimer emails are PII).
alter table public.registry_link_claims enable row level security;

drop policy if exists "registry_link_claims_deny_anon" on public.registry_link_claims;
create policy "registry_link_claims_deny_anon"
  on public.registry_link_claims
  as restrictive
  for all
  to anon
  using (false);
