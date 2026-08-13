-- ──────────────────────────────────────────────────────────────
-- 2026-05-29 — registry_item_claims idempotency
--
-- Audit 2026-05-29 flagged a real race condition in the Stripe
-- webhook (POST /api/stripe/webhook → handleCheckoutCompleted):
--
--   The `payments` table is idempotent by stripe_session_id (it
--   already has UNIQUE on that column, and the handler pre-checks
--   for an existing row). But the sibling insert into
--   registry_item_claims has NO idempotency guard at all, and no
--   stripe_session_id column to anchor one. Concurrent retries
--   (or any retry-after-partial-success) duplicate the claim row,
--   double-link the same Stripe session, and double-bump
--   registry_items.quantity_claimed — meaning the same paid gift
--   can be marked claimed twice, which the UI presents to other
--   guests as a now-unavailable item that was actually paid for
--   once.
--
-- Fix:
--   1. Add stripe_session_id column to registry_item_claims
--   2. Backfill from the linked payments row where possible
--   3. Add a partial unique index on stripe_session_id so a
--      second insert with the same session_id fails fast at the
--      DB layer (the webhook also pre-checks and catches the
--      unique-violation as benign — belt + braces)
--
-- The partial index is required because historical rows pre-2026-
-- 05-29 may have stripe_session_id NULL after the backfill
-- (claim rows whose payment_id was NULLed by an earlier
-- registry_items delete). Standard UNIQUE would block backfill.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE registry_item_claims
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

UPDATE registry_item_claims c
SET stripe_session_id = p.stripe_session_id
FROM payments p
WHERE c.payment_id = p.id
  AND c.stripe_session_id IS NULL
  AND p.stripe_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registry_claims_stripe_session_unique
  ON registry_item_claims(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
