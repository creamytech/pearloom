-- ─────────────────────────────────────────────────────────────
-- 20260703_group_gifts.sql — Chip in on big items + the
-- thank-you ledger (R3).
--
-- 1 · allow_group_gift on registry_items: the host opts a big
--     item into group gifting. Guests "chip in" what they like
--     via gift_pledges rows carrying item_id (the honor ledger —
--     Pearloom never processes the money); the item is never
--     marked spoken-for by chip-ins.
--
-- 2 · thanked_at on all three gift ledgers (registry_link_claims,
--     registry_item_claims, gift_pledges): the host's explicit
--     "Mark thanked" stamp. Drafting a thank-you note does NOT
--     set it — only the deliberate toggle does. NULL = still to
--     thank.
--
-- No RLS changes: all three tables already carry belt-and-braces
-- deny-anon policies; reads/writes stay behind the owner-gated
-- API routes via the service-role client (CLAUDE-DESIGN §12).
--
-- NOTE: per CLAUDE-DESIGN §12 this file must ALSO be applied to
-- prod (project vpwnpxowqflajvqpgvyb) via MCP and recorded in
-- _pearloom_migrations. It has NOT been applied automatically —
-- do that at review time, not from this session.
-- ─────────────────────────────────────────────────────────────

alter table public.registry_items
  add column if not exists allow_group_gift boolean not null default false;

alter table public.registry_link_claims
  add column if not exists thanked_at timestamptz;

alter table public.registry_item_claims
  add column if not exists thanked_at timestamptz;

alter table public.gift_pledges
  add column if not exists thanked_at timestamptz;
