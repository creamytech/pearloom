-- ─────────────────────────────────────────────────────────────
-- scheduled_communications — Pearloom Smart Send Cadence
--
-- One row per *planned* outbound communication for an event.
-- The cadence module seeds rows from the per-occasion preset
-- (save-the-date / invitation / reminder / day-before / thank-you)
-- and the host approves, edits, or cancels each one.
--
-- A dispatcher (cron / scheduled function — not in this migration)
-- queries `WHERE status='scheduled' AND scheduled_at <= now()` and
-- ships the message via the channel's adapter (email through the
-- existing /api/invite/postmark route, SMS later).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scheduled_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL,
  owner_email text NOT NULL,

  -- Phase identity. phase_id matches CadencePhase.id from the
  -- preset module so the host UI can dedupe re-seeds.
  phase_id text NOT NULL,
  label text NOT NULL,
  product text NOT NULL,
  channels text[] NOT NULL DEFAULT '{}',
  audience text,                                  -- all | pending-rsvp | attending | declined

  -- When + how.
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft',           -- draft | scheduled | sent | cancelled | failed
  status_detail text,

  -- Copy. Pear drafts via /api/cadence/draft, host can override.
  subject text,
  body text,
  draft_voice text,                               -- snapshot of voiceDNA at draft time

  -- Run metadata.
  sent_at timestamptz,
  sent_count int DEFAULT 0,
  failure_count int DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (site_id, phase_id)
);

CREATE INDEX IF NOT EXISTS idx_sched_comms_site ON scheduled_communications(site_id);
CREATE INDEX IF NOT EXISTS idx_sched_comms_owner ON scheduled_communications(owner_email);
CREATE INDEX IF NOT EXISTS idx_sched_comms_due ON scheduled_communications(scheduled_at)
  WHERE status = 'scheduled';

ALTER TABLE scheduled_communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sched_comms_deny_anon" ON scheduled_communications;
CREATE POLICY "sched_comms_deny_anon"
  ON scheduled_communications
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);
