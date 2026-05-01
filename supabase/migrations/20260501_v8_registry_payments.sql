-- ──────────────────────────────────────────────────────────────
-- v8 Tier S — native registry + Stripe payments + guest CSV import
--
-- This migration:
--   1. Extends registry_items so items can be NATIVE to a Pearloom
--      site (no external store required) — the guest claim + pay flow
--   2. Creates a payments table — durable record of every Stripe
--      payment (registry purchase, cash gift, template subscription)
--   3. Extends guests with address columns + import-batch tracking
--      so CSV import can populate addresses for save-the-date /
--      thank-you-note flows
--
-- Belt-and-braces RLS deny-anon on every table written via the
-- service-role API client.
-- ──────────────────────────────────────────────────────────────

-- ── 1. registry_items: extend for native ownership + claim/pay ──

ALTER TABLE registry_items
  ADD COLUMN IF NOT EXISTS site_id text,
  ADD COLUMN IF NOT EXISTS user_id text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS quantity int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quantity_claimed int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimed_by_email text,
  ADD COLUMN IF NOT EXISTS claimed_by_name text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_note text,
  ADD COLUMN IF NOT EXISTS payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Items can now be either:
--   (a) native: site_id set, source_id NULL  (Pearloom-hosted item)
--   (b) external: source_id set                (link out to Zola etc)
DO $$ BEGIN
  ALTER TABLE registry_items ALTER COLUMN source_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- payment_status enum values: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
DO $$ BEGIN
  ALTER TABLE registry_items ADD CONSTRAINT registry_items_payment_status_check
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_registry_items_site_id ON registry_items(site_id);
CREATE INDEX IF NOT EXISTS idx_registry_items_payment_intent ON registry_items(payment_intent_id);

-- ── 2. payments: durable record of every Stripe payment ──

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL,
  user_id text,
  payer_email text NOT NULL,
  payer_name text,
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  pearloom_fee_cents int DEFAULT 0,
  net_amount_cents int,
  payment_type text NOT NULL,
  registry_item_id uuid REFERENCES registry_items(id) ON DELETE SET NULL,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check
    CHECK (payment_type IN ('registry', 'cash_gift', 'template_subscription', 'tip'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_site_id ON payments(site_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_email ON payments(payer_email);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON payments(stripe_session_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_deny_anon" ON payments;
CREATE POLICY "payments_deny_anon"
  ON payments
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- ── 3. guests: extend for address collection + CSV import metadata ──

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS mailing_address_line1 text,
  ADD COLUMN IF NOT EXISTS mailing_address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS party_label text,
  ADD COLUMN IF NOT EXISTS plus_one_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS import_batch_id text,
  ADD COLUMN IF NOT EXISTS address_collection_token text,
  ADD COLUMN IF NOT EXISTS address_collected_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_guests_import_batch ON guests(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_guests_address_token ON guests(address_collection_token);

-- ── 4. registry_item_claims: separate table for partial-quantity claims ──
--
-- A single registry item with quantity=4 (e.g., a set of plates) can be
-- claimed in pieces by multiple guests. The denormalised
-- registry_items.quantity_claimed lets the UI show "2 of 4 claimed"
-- without joining; this table is the source of truth.

CREATE TABLE IF NOT EXISTS registry_item_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_item_id uuid NOT NULL REFERENCES registry_items(id) ON DELETE CASCADE,
  site_id text NOT NULL,
  payer_email text NOT NULL,
  payer_name text,
  quantity int NOT NULL DEFAULT 1,
  amount_cents int NOT NULL,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE registry_item_claims ADD CONSTRAINT registry_item_claims_status_check
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_registry_claims_item ON registry_item_claims(registry_item_id);
CREATE INDEX IF NOT EXISTS idx_registry_claims_site ON registry_item_claims(site_id);

ALTER TABLE registry_item_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registry_item_claims_deny_anon" ON registry_item_claims;
CREATE POLICY "registry_item_claims_deny_anon"
  ON registry_item_claims
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);
