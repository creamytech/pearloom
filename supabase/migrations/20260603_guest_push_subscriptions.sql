-- ─────────────────────────────────────────────────────────────
-- guest_push_subscriptions — Web Push endpoints per guest.
--
-- Powers the day-of "ceremony starting in 10 minutes" pings the
-- Personalized Guest Passport sends. Each guest's browser
-- subscribes via the Push API; we store the endpoint + keys
-- (encrypted at rest at the Supabase layer).
--
-- Same belt-and-braces RLS as everything else.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guest_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL,
  guest_token text NOT NULL,
  site_id text NOT NULL,

  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,

  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,

  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_guest_push_token ON guest_push_subscriptions(guest_token);
CREATE INDEX IF NOT EXISTS idx_guest_push_site ON guest_push_subscriptions(site_id);

ALTER TABLE guest_push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guest_push_deny_anon" ON guest_push_subscriptions;
CREATE POLICY "guest_push_deny_anon"
  ON guest_push_subscriptions
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- Per-token PWA manifest: lets a guest install Pearloom as a
-- mobile-first companion app for their event.
CREATE TABLE IF NOT EXISTS guest_companion_state (
  guest_token text PRIMARY KEY,
  last_seen_at timestamptz,
  installed_at timestamptz,
  push_enabled boolean NOT NULL DEFAULT false,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guest_companion_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guest_companion_deny_anon" ON guest_companion_state;
CREATE POLICY "guest_companion_deny_anon"
  ON guest_companion_state
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);
