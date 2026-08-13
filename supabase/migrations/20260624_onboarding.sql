-- ─────────────────────────────────────────────────────────────
-- 20260624_onboarding.sql — the Welcome flow (first-run
-- onboarding at /welcome).
--
--   onboarded_at      — set once the flow completes; the /welcome
--                       server gate routes finished users straight
--                       through to their destination.
--   terms_accepted_at — explicit Terms + Privacy agreement
--                       timestamp, stamped server-side when the
--                       flow's agreement step is confirmed.
--   intent            — what brought them to the loom ('wedding',
--                       'baby', 'memorial', 'exploring', …);
--                       seeds wizard defaults + Pear's tone later.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS intent text;
