-- ──────────────────────────────────────────────────────────────
-- 2026-05-30 — account_deletions audit log
--
-- Phase 1.5 (GDPR self-serve delete) shipped without an audit
-- trail. The route header at src/app/api/user/delete-account
-- explicitly named this as a follow-up — relying on Supabase +
-- Vercel logs alone is fragile for compliance evidence ("did
-- you actually delete this user when they asked?") and operator
-- forensics ("how many account closures last month, and which
-- sites went with them?").
--
-- Defensive shape:
--   • We don't store the deleted email — defeats GDPR right-to-
--     be-forgotten. We store sha256(lower(trim(email))) so the
--     row can be looked up if the same person ever re-registers
--     and asks "did I delete an account once?", but the original
--     email is unrecoverable from the audit row.
--   • Site count, not site IDs/names. Operators get the "how
--     much was deleted" signal without retaining identifying
--     information about the lost sites.
--   • Restrictive deny-anon RLS — same belt-and-braces pattern
--     as every other public-write table (CLAUDE-DESIGN.md §14).
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS account_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- sha256(lower(trim(email))) — 64 hex chars. Lets us answer
  -- "have you deleted before?" without retaining the original.
  email_sha256 text NOT NULL,
  sites_deleted int NOT NULL DEFAULT 0,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  -- Optional client IP at the time of delete — useful for
  -- abuse forensics (chain-deletion from a hijacked session
  -- shows as N rows from one IP). Hashed for the same reason
  -- the email is. Null when /api/user/delete-account can't read
  -- the forwarded-for header.
  ip_sha256 text
);

CREATE INDEX IF NOT EXISTS idx_account_deletions_email
  ON account_deletions(email_sha256);

CREATE INDEX IF NOT EXISTS idx_account_deletions_deleted_at
  ON account_deletions(deleted_at DESC);

ALTER TABLE account_deletions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_deletions_deny_anon" ON account_deletions;
CREATE POLICY "account_deletions_deny_anon"
  ON account_deletions
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);
