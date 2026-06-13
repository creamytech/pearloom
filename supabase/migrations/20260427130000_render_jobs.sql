-- ─────────────────────────────────────────────────────────────
-- render_jobs — async image generation jobs
--
-- gpt-image-2 in 'high' quality at 1024x1536 routinely takes
-- 60–120 seconds. Vercel's request gateway times out a held
-- response well before the image finishes — the host sees
-- "Pear timed out before the painter finished" even though
-- the painter is still painting.
--
-- New flow:
--   1. POST /api/invite/render writes a job row with status=pending
--      and returns { jobId } immediately.
--   2. The route schedules the actual painter call via Next's
--      after() so it runs after the response sends, up to the
--      function's full maxDuration. On finish it updates the row
--      with status=complete + url (or status=failed + error).
--   3. Client polls GET /api/invite/render/{jobId} every 2s until
--      status flips. No held connections, no gateway timeouts.
--
-- One table covers every painter surface (invite, qr-poster, etc.)
-- — the `surface` column tells us what was painted, the `payload`
-- jsonb stores the original request for debugging.
--
-- RLS: belt-and-braces deny-anon. Writes go through the
-- service-role client in the API route. Polling is gated on
-- owner_email matching the requester's session email.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email text NOT NULL,
  site_slug text,

  -- Which painter surface this job is for. Drives result shape.
  --   invite          → /api/invite/render
  --   qr-poster       → /api/qr/themed
  --   decor-recolor   → /api/decor/recolor (eligible for migration)
  surface text NOT NULL CHECK (surface IN ('invite', 'qr-poster', 'decor-recolor', 'other')),

  -- Original request body, kept for replay + debugging. Sensitive
  -- payloads (portrait base64) are stripped before write — only
  -- references survive. See sanitizeJobPayload() in the route.
  payload jsonb,

  -- Lifecycle.
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  status_detail text,

  -- Result. URL is the R2 public URL of the painted image; mime
  -- echoes the painter's output. Both null until status=complete.
  result_url text,
  result_mime text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_render_jobs_owner ON render_jobs(owner_email);
CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON render_jobs(status) WHERE status IN ('pending', 'running');

-- RLS: belt-and-braces deny-anon.
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "render_jobs_deny_anon" ON render_jobs;
CREATE POLICY "render_jobs_deny_anon"
  ON render_jobs
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);
