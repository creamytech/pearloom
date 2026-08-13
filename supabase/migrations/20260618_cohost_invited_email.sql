-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260618_cohost_invited_email.sql
--
-- The Share panel's email-invite route was inserting an
-- `invited_email` column that never existed (the insert failed
-- silently and the invite email shipped a dead token). Add the
-- column so the pending-invite list can show WHO was invited and
-- the accept page can greet them.
--
-- Idempotent — re-running is a no-op.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.cohost_invites
  ADD COLUMN IF NOT EXISTS invited_email text;
