-- ─────────────────────────────────────────────────────────────
-- 20260703_gift_pledges.sql — The honor ledger (R2-lite)
--
-- Pearloom NEVER processes gift money. registryFunds on the
-- manifest are the host's own P2P handles (Venmo / PayPal.Me /
-- Cash App / Zelle); after a guest gives directly, they may add
-- their gift to this honor-system thread ("Woven in — thank you").
--
-- amount_cents is the GUEST'S OWN claim — surfaced publicly only
-- as an aggregate ("as shared by guests"); individual amounts are
-- host-only. item_id optionally ties a pledge to a native
-- registry_items row.
--
-- Belt-and-braces RLS: restrictive deny-anon; all reads/writes go
-- through /api/gift-pledges (public write is rate-limited; the
-- host read is owner-gated) via the service-role client
-- (CLAUDE-DESIGN §12).
--
-- NOTE: per CLAUDE-DESIGN §12 this file must ALSO be applied to
-- prod (project vpwnpxowqflajvqpgvyb) via MCP and recorded in
-- _pearloom_migrations. It has NOT been applied automatically —
-- do that at review time, not from this session.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.gift_pledges (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  item_id uuid references public.registry_items(id) on delete cascade,
  guest_name text not null,
  amount_cents int,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists gift_pledges_site_idx on public.gift_pledges (site_id);

alter table public.gift_pledges enable row level security;

drop policy if exists "gift_pledges_deny_anon" on public.gift_pledges;
create policy "gift_pledges_deny_anon"
  on public.gift_pledges
  as restrictive
  for all
  to anon
  using (false);
