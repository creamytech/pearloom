-- ─────────────────────────────────────────────────────────────
-- print_jobs — Pearloom Print fulfillment tracking
--
-- Hosts can mail physical save-the-dates, invitations, thank-you
-- cards, and photo books directly from the invite designer. Each
-- submission creates one print_jobs row PER recipient — that way
-- per-recipient tracking from Lob's webhook (mailed → delivered)
-- can flow back without a separate join table.
--
-- A single host action (e.g. "Mail to 50 guests") creates a
-- batch_id shared by all 50 rows so the dashboard can group them.
--
-- RLS: belt-and-braces deny-anon. Reads + writes go through the
-- service-role client in the API route, gated on
-- site_config.creator_email = session.user.email.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL,
  owner_email text NOT NULL,

  -- Groups every row from a single host send action.
  batch_id text NOT NULL,

  -- What was sent.
  product text NOT NULL CHECK (product IN ('postcard', 'letter', 'thankyou', 'book')),
  kind text NOT NULL CHECK (kind IN ('save-the-date', 'invitation', 'thankyou', 'memorial-program', 'photo-book')),
  size text,                       -- '4x6' | '5x7' | '6x9' for cards; 'A4' for books

  -- Artwork — front + back PNG URLs uploaded to R2 before submission.
  -- Same artwork URL repeats across every row in the batch.
  front_url text NOT NULL,
  back_url text,

  -- Recipient — the actual mailing address for this row.
  guest_id text,
  recipient_name text,
  recipient_address jsonb,         -- structured address for audit + future re-sends

  -- Provider integration.
  provider text NOT NULL DEFAULT 'lob',  -- lob | mixam | stub
  provider_job_id text,
  status text NOT NULL DEFAULT 'pending', -- pending | submitted | rendered | mailed | delivered | failed | cancelled
  status_detail text,
  tracking_number text,
  tracking_url text,

  -- Money — recorded per row so the batch total is just SUM(cost_cents).
  cost_cents int,
  currency text DEFAULT 'USD',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  mailed_at timestamptz,
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_site ON print_jobs(site_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_owner ON print_jobs(owner_email);
CREATE INDEX IF NOT EXISTS idx_print_jobs_batch ON print_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status) WHERE status IN ('pending', 'submitted', 'rendered');
CREATE INDEX IF NOT EXISTS idx_print_jobs_provider_job ON print_jobs(provider, provider_job_id);

-- RLS: belt-and-braces deny-anon.
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "print_jobs_deny_anon" ON print_jobs;
CREATE POLICY "print_jobs_deny_anon"
  ON print_jobs
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);
