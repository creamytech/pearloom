-- ─────────────────────────────────────────────────────────────
-- 20260626_verify_and_cleanup.sql
-- 1. Email verification for manual accounts: signup emails a
--    single-use verify link (raw token mailed, SHA-256 stored —
--    same posture as password resets). Non-blocking: sign-in
--    works unverified; the timestamp records the proof.
-- 2. Drop vendor_shortlists — created 20260428, zero reads,
--    zero writes, zero rows. Audit 2026-06-11 sentenced it.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.account_credentials
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verify_token_hash text;

DROP TABLE IF EXISTS public.vendor_shortlists;
