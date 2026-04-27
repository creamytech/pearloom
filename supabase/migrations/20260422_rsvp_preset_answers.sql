-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260422_rsvp_preset_answers.sql
-- Adds preset + answers columns to `guests` so non-wedding
-- events (bachelor, shower, memorial, reunion, milestone,
-- cultural) can persist the preset-specific answers from
-- PresetRsvpForm (src/components/PresetRsvpForm.tsx).
--
-- The API route /api/rsvp upserts into public.guests (not the
-- legacy public.rsvps table). Existing columns
-- (meal_preference, dietary_restrictions, song_request, message)
-- stay populated by the API when the preset maps onto them so
-- the wedding dashboard keeps working unchanged. Non-wedding
-- presets additionally populate `answers`.
--
-- See CLAUDE-DESIGN.md §14 and CLAUDE-PRODUCT.md §4.2.
-- ─────────────────────────────────────────────────────────────

alter table if exists public.guests
  add column if not exists rsvp_preset  text,
  add column if not exists rsvp_answers jsonb not null default '{}'::jsonb;

comment on column public.guests.rsvp_preset  is 'Which RsvpPreset the form used (wedding | shower | bachelor | memorial | reunion | milestone | cultural | casual). Null for legacy rows.';
comment on column public.guests.rsvp_answers is 'Preset-specific answer bag. Legacy meal/dietary/song/message columns remain authoritative when present; everything else goes here.';

create index if not exists guests_rsvp_preset_idx on public.guests(rsvp_preset) where rsvp_preset is not null;
