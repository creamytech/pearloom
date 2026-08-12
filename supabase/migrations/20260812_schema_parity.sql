-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260812_schema_parity.sql — Sprint S.1
--
-- The first full prod ↔ migrations schema diff (2026-08-12,
-- REVAMP-EXECUTION-PLAN §3) found two gaps where production and
-- the migration set had drifted apart. This migration closes the
-- "code expects it, no migration declares it" direction so a
-- fresh database built from supabase/migrations alone can run
-- every live code path.
--
-- 1. `marketplace_purchases` — read by /api/marketplace/owned and
--    WRITTEN by /api/billing/webhook (src/lib/marketplace.ts),
--    but the table existed in NO migration and NOT in prod: any
--    Stripe marketplace purchase would have failed at
--    recordPurchase(). Shape matches exactly what the code
--    reads/writes.
--
-- 2. `vendors` prod-only columns — production's vendors table
--    carries amount_cents / site_id / status from an early ad-hoc
--    shape that predates 20260416_event_os.sql; no migration
--    declares them, so a fresh build lacked columns prod has.
--    Added `if not exists` (a no-op on prod, closure on fresh
--    builds).
--
-- Everything here is idempotent; safe on prod and on empty DBs.
-- ─────────────────────────────────────────────────────────────

-- ── 1 · marketplace_purchases ────────────────────────────────

create table if not exists public.marketplace_purchases (
  id                 uuid primary key default gen_random_uuid(),
  user_email         text not null,
  item_id            text not null,
  item_type          text,
  price_paid         numeric,
  stripe_session_id  text unique,
  purchased_at       timestamptz not null default now()
);

create index if not exists marketplace_purchases_user_email_idx
  on public.marketplace_purchases(user_email);

create index if not exists marketplace_purchases_item_id_idx
  on public.marketplace_purchases(item_id);

alter table public.marketplace_purchases enable row level security;

-- Deny anon — reads/writes go through service-role API routes only
-- (belt-and-braces restrictive policy per CLAUDE-DESIGN.md §12).
drop policy if exists "marketplace_purchases_deny_anon" on public.marketplace_purchases;
create policy "marketplace_purchases_deny_anon"
  on public.marketplace_purchases
  as restrictive
  for all
  to anon
  using (false);

-- ── 2 · vendors parity columns ───────────────────────────────

alter table public.vendors add column if not exists amount_cents integer;
alter table public.vendors add column if not exists site_id text;
alter table public.vendors add column if not exists status text;
