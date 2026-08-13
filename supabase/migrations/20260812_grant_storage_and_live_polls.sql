-- ─────────────────────────────────────────────────────────────
-- 20260812 · The storage the code already ships against.
--
-- The 2026-08-12 full-simulation audit (docs/NEW-USER-REVAMP.md H5)
-- found a family of tables referenced by LIVE code that existed in
-- no schema — neither prod nor migrations:
--
--   · user_plans — the monetization spine. plan-gate.ts reads it on
--     every gate; BOTH Stripe webhooks grant purchases by upserting
--     into it. Without it a paying customer is charged and never
--     receives their plan (the grant throws; lookups degrade to
--     free limits).
--   · section_analytics — the published site's AnalyticsBeacon
--     writes a row per section view; DashAnalytics reads it. Every
--     beacon 500'd in prod.
--   · site_invites — coordinator/viewer invites (lib/db.ts).
--   · guestbook_messages + whispers.message/read_at — polled by the
--     notification bell on every dashboard load; errored forever.
--
-- All IF NOT EXISTS so environments that hand-created any of these
-- (SETUP.md's manual SQL) converge instead of failing. RLS follows
-- the house belt-and-braces pattern: deny-anon restrictive; the
-- service-role client in routes is the only writer.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_plans (
  user_email TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_plans_deny_anon ON public.user_plans;
CREATE POLICY user_plans_deny_anon ON public.user_plans
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE TABLE IF NOT EXISTS public.section_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  section_id TEXT,
  event_type TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_section_analytics_site
  ON public.section_analytics (site_id, created_at DESC);
ALTER TABLE public.section_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS section_analytics_deny_anon ON public.section_analytics;
CREATE POLICY section_analytics_deny_anon ON public.section_analytics
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE TABLE IF NOT EXISTS public.site_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'coordinator',
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.site_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_invites_deny_anon ON public.site_invites;
CREATE POLICY site_invites_deny_anon ON public.site_invites
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE TABLE IF NOT EXISTS public.guestbook_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  guest_name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guestbook_messages_site
  ON public.guestbook_messages (site_id, created_at DESC);
ALTER TABLE public.guestbook_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS guestbook_messages_deny_anon ON public.guestbook_messages;
CREATE POLICY guestbook_messages_deny_anon ON public.guestbook_messages
  AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.whispers ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.whispers ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
