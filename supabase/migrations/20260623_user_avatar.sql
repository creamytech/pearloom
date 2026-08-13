-- ─────────────────────────────────────────────────────────────
-- 20260623_user_avatar.sql — account marks (orchard avatars).
-- Users pick one of the hand-drawn SVG marks (PL_AVATARS in
-- src/components/pearloom/avatars.tsx) as their account avatar.
-- Stored by id; rendering stays in code so the art can evolve.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS avatar text;
