-- ─────────────────────────────────────────────────────────────
-- 20260622_event_graph_phase2.sql — event graph phase 2:
-- event-scoped messaging + the signed-off security fix.
--
-- 1. site_messages — one table for both messaging shapes:
--      thread = 'party' → the event's guest thread (every guest
--        with a valid token can read + post; host moderates).
--      thread = 'dm'    → host ↔ one guest logistics messages,
--        scoped by guest_id (public.guests roster row).
--    Guests authenticate by passport/guest token through the
--    service-role API (/api/messages); hosts by session +
--    site ownership (/api/messages/host). Belt-and-braces
--    deny-anon RLS as everywhere else (CLAUDE-DESIGN.md §14.3).
--    Delivery is poll-based for now (the BroadcastBar pattern);
--    Supabase Realtime is the named upgrade path.
--
-- 2. _pearloom_migrations RLS — flagged by the Supabase advisor
--    (table was fully exposed to anon/authenticated roles).
--    Owner signed off 2026-06-11. No policies on purpose: only
--    the service-role migration runner (scripts/db-migrate.ts)
--    touches it, and service role bypasses RLS.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  -- 'party' (event-wide guest thread) | 'dm' (host ↔ guest_id).
  thread text NOT NULL DEFAULT 'party' CHECK (thread IN ('party', 'dm')),
  -- Roster row (public.guests). Required for DMs; on party posts
  -- it attributes the author when known (token-bridged guests
  -- without a roster row post with author_name only).
  guest_id uuid REFERENCES public.guests(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('host', 'guest')),
  -- Identity-graph attribution (people, migration 20260621).
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  -- Host moderation — hidden messages stay for the audit trail
  -- but never render to guests again.
  hidden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- DMs must always be addressed to someone.
ALTER TABLE public.site_messages
  DROP CONSTRAINT IF EXISTS site_messages_dm_has_guest;
ALTER TABLE public.site_messages
  ADD CONSTRAINT site_messages_dm_has_guest
  CHECK (thread <> 'dm' OR guest_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS site_messages_site_thread_idx
  ON public.site_messages(site_id, thread, created_at DESC);
CREATE INDEX IF NOT EXISTS site_messages_guest_idx
  ON public.site_messages(guest_id) WHERE guest_id IS NOT NULL;

ALTER TABLE public.site_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_messages_deny_anon" ON public.site_messages;
CREATE POLICY "site_messages_deny_anon"
  ON public.site_messages
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- ── 2. Advisor remediation (signed off) ───────────────────────
ALTER TABLE public._pearloom_migrations ENABLE ROW LEVEL SECURITY;
