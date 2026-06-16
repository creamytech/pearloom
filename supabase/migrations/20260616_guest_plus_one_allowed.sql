-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260616_guest_plus_one_allowed.sql
-- Per-guest plus-one permission.
--
-- The host can grant a plus-one to specific guests (not just the
-- site-wide rsvpConfig.plusOne toggle). This is the HOST'S grant —
-- distinct from `plus_one`, which is the GUEST'S RSVP answer that
-- they are bringing someone. The guest RSVP form shows the
-- "Bringing a guest?" field when EITHER the site-wide toggle is on
-- OR this guest was granted one.
-- ─────────────────────────────────────────────────────────────

alter table public.guests
  add column if not exists plus_one_allowed boolean not null default false;

comment on column public.guests.plus_one_allowed is
  'Host grants this guest a plus-one. Distinct from plus_one (the guest RSVP answer that they are bringing one).';
