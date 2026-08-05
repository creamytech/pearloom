-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260805_concierge_numbers.sql
-- A celebration's own concierge number (docs/CONCIERGE.md).
--
-- The inbound concierge resolves a guest from the number they text
-- FROM. This is the other half: the number they text TO. When a
-- celebration has its own number, there is never anything to
-- disambiguate — the number itself names the event.
--
-- Optional by design. A shared number costs nothing per
-- celebration and scales to thousands, at the price of asking a
-- guest on two lists which one they mean. A dedicated number is
-- ~$1/month, so it's a premium touch, not the default. Both are
-- supported; this column is simply null for the shared case.
--
-- Stored as DIGITS ONLY (normalizeNumberKey) so +1 (555) 123-0000
-- and +15551230000 can't both exist and route differently. The
-- unique index enforces that one number never names two
-- celebrations — a collision there would deliver one host's guests
-- to another host's site.
--
-- No RLS change needed: `sites` already carries its policy, and
-- this column is only ever read by the service-role webhook.
-- ─────────────────────────────────────────────────────────────

alter table public.sites
  add column if not exists concierge_number text;

comment on column public.sites.concierge_number is
  'Digits-only E.164 of this celebration''s dedicated concierge number. '
  'Null = it uses the shared Pearloom number. Set by ops when a number is bought.';

-- Digits only, plausible length. A malformed value here would
-- silently never match rather than fail loudly, so it's refused at
-- the door instead.
alter table public.sites
  drop constraint if exists sites_concierge_number_digits;
alter table public.sites
  add constraint sites_concierge_number_digits
  check (concierge_number is null or concierge_number ~ '^[0-9]{7,15}$');

-- One number, one celebration — ever.
create unique index if not exists sites_concierge_number_key
  on public.sites (concierge_number)
  where concierge_number is not null;
