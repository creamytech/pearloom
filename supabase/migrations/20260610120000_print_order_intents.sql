-- ─────────────────────────────────────────────────────────────
-- print_order_intents — Suite Phase 6: paid print checkout.
--
-- One row per host "mail this batch" action. The row is created
-- BEFORE the Stripe Checkout session and is the ledger entry that
-- (a) gates Lob submission on payment and (b) tracks legacy-plan
-- print-credit consumption (sum of credit_applied_cents over
-- paid/fulfilled rows — see src/lib/print-engine/pricing.ts).
--
-- Status machine:
--   awaiting_payment → paid → fulfilled
--                    → expired           (checkout session expired)
--   paid → failed                        (every Lob submission failed)
--
-- Rows are IMMUTABLE after 'paid' except status transitions +
-- fulfilled_at + status_detail. The artwork (front_url), guest set
-- (guest_ids), and all money columns are frozen at intent creation
-- so the webhook fulfills exactly what was priced.
--
-- RLS: belt-and-braces deny-anon (house pattern, CLAUDE-DESIGN
-- §14.3). All reads/writes go through the service-role client in
-- /api/print/checkout + /api/stripe/webhook.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS print_order_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  site_id text,

  -- What's being mailed.
  kind text,                              -- 'save-the-date' | 'invitation' | 'thankyou' | …
  product text,                           -- 'postcard' | 'letter' | 'thankyou' | 'book'
  size text,                              -- '4x6' | '6x9' | '6x11'
  front_url text,                         -- the rendered 300dpi PNG on R2
  guest_ids jsonb,                        -- the exact recipient set priced at checkout
  return_address jsonb,
  recipient_count int,

  -- Money — server-computed, frozen at intent creation.
  retail_total_cents int,
  credit_applied_cents int DEFAULT 0,
  amount_due_cents int,

  stripe_session_id text UNIQUE,
  status text DEFAULT 'awaiting_payment', -- awaiting_payment | paid | fulfilled | failed | expired
  status_detail text,

  created_at timestamptz DEFAULT now(),
  fulfilled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_print_order_intents_user ON print_order_intents(user_email);
CREATE INDEX IF NOT EXISTS idx_print_order_intents_session ON print_order_intents(stripe_session_id);

-- RLS: belt-and-braces deny-anon.
ALTER TABLE print_order_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "print_order_intents_deny_anon" ON print_order_intents;
CREATE POLICY "print_order_intents_deny_anon"
  ON print_order_intents
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);
