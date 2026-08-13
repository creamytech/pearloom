-- ─────────────────────────────────────────────────────────────
-- 20260625_account_credentials.sql — manual (email + password)
-- accounts. Replaces the launch-era in-memory credential map,
-- which lost every account on deploy and never worked across
-- serverless instances.
--
-- password_hash format: lib/password.ts `s2$<salt>$<scrypt hash>`.
-- reset_token_hash holds the SHA-256 of the emailed reset token
-- (the raw token never touches the database).
-- Belt-and-braces deny-anon RLS; service-role auth paths only.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.account_credentials (
  email text PRIMARY KEY,
  password_hash text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  reset_token_hash text,
  reset_expires_at timestamptz
);

ALTER TABLE public.account_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_credentials_deny_anon" ON public.account_credentials;
CREATE POLICY "account_credentials_deny_anon"
  ON public.account_credentials
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);
