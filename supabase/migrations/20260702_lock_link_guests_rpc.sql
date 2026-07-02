-- ─────────────────────────────────────────────────────────────
-- Lock down link_guests_to_people RPC
--
-- Supabase security advisor: the function is SECURITY DEFINER and
-- was executable by anon + authenticated via /rest/v1/rpc — any
-- visitor could trigger a guest→person linking pass for an
-- arbitrary site id. Its only real callers are the server routes
-- (/api/guests/import, /api/guests/copy-from) on the service-role
-- key, which bypasses grants entirely.
--
-- APPLIED to prod (project vpwnpxowqflajvqpgvyb) via MCP on
-- 2026-07-02 and recorded in _pearloom_migrations.
-- ─────────────────────────────────────────────────────────────

revoke execute on function public.link_guests_to_people(uuid) from anon, authenticated, public;
