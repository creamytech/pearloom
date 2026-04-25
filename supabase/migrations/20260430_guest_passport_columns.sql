-- ─────────────────────────────────────────────────────────────
-- 2026-04-30 · Guest passport columns
--
-- Adds the columns the personalized greeting + per-guest passport
-- link rely on. Each is nullable so existing rows aren't disturbed.
-- ─────────────────────────────────────────────────────────────

alter table public.guests
  add column if not exists passport_token text,
  add column if not exists table_name text,
  add column if not exists dietary_restrictions text;

create unique index if not exists guests_passport_token_idx
  on public.guests (passport_token)
  where passport_token is not null;
