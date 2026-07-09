-- ─────────────────────────────────────────────────────────────
-- 20260703_vendor_packets.sql — Vendor call-sheet packet tokens
--
-- Adds packet_token to site_vendors (20260702_site_vendors.sql).
-- The token is a crypto-random, unguessable handle the host mints
-- from the Vendor Book ("Call sheet →") and hands to the vendor;
-- /vp/{token} resolves it to a read-only day-of call sheet (event
-- name + date, venue, host day-of contact, this vendor's arrival
-- time, the run of show). Nothing else — never money, never notes,
-- never the host's account email.
--
-- Minted by the owner-gated POST /api/vendors/book/packet
-- (idempotent — one token per vendor row); read by the public
-- GET /api/vendor-packet/[token] + the /vp/[token] page via the
-- service role. RLS stays the 20260702 deny-anon restrictive
-- policy — anon can never read the table directly.
--
-- NOTE: per CLAUDE-DESIGN §12 this file must ALSO be applied to
-- prod (project vpwnpxowqflajvqpgvyb) via MCP and recorded in
-- _pearloom_migrations. It has NOT been applied automatically —
-- do that at review time, not from this session.
-- ─────────────────────────────────────────────────────────────

alter table public.site_vendors
  add column if not exists packet_token text unique;

-- Token → vendor is the public packet route's hot path.
create index if not exists site_vendors_packet_token_idx
  on public.site_vendors (packet_token)
  where packet_token is not null;
