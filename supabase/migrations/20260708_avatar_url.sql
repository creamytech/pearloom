-- ONBOARDING-PLAN O1 — the mark system.
-- A real profile photograph joins the orchard marks: uploaded via
-- /api/user/avatar (R2, 512px square, EXIF stripped client+server),
-- stored here as a URL. The product-wide fallback chain becomes
-- avatar_url → orchard mark → Google photo → monogram seal.
--
-- NOTE: apply to prod via the Supabase MCP from an AUTHED session
-- and record in _pearloom_migrations (the 2026-07-08 build session
-- had no MCP auth — this file shipped ahead of the prod apply).

alter table public.user_preferences
  add column if not exists avatar_url text;
