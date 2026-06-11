-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260618_theme_pack_purchases.sql
-- Theme-Store pack ownership ledger.
--
-- Append-only log of pack purchases. Stripe webhooks insert
-- via the service-role client in src/lib/theme-store/entitlements.ts;
-- free packs do NOT get rows here — implicit ownership is
-- derived from the pack catalog (Pack.tier === 'free').
--
-- Idempotency is on (stripe_session_id) — Stripe delivers
-- webhooks at-least-once, so the upsert in addEntitlement()
-- is a no-op on retry.
--
-- Belt-and-braces RLS: deny anon entirely (restrictive policy)
-- per CLAUDE-DESIGN.md §14.3. Reads/writes go through the
-- service-role key in API routes.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.theme_pack_purchases (
  id                 uuid primary key default gen_random_uuid(),
  user_email         text not null,
  pack_id            text not null,
  purchased_at       timestamptz not null default now(),
  stripe_session_id  text unique,
  amount_cents       integer,
  currency           text not null default 'usd'
);

create index if not exists theme_pack_purchases_user_email_idx
  on public.theme_pack_purchases(user_email);

create index if not exists theme_pack_purchases_pack_id_idx
  on public.theme_pack_purchases(pack_id);

alter table public.theme_pack_purchases enable row level security;

-- Deny anon — writes go through service-role API routes only.
drop policy if exists "theme_pack_purchases_deny_anon" on public.theme_pack_purchases;
create policy "theme_pack_purchases_deny_anon"
  on public.theme_pack_purchases
  as restrictive
  for all
  to anon
  using (false);
