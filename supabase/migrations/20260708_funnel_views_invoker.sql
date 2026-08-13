-- The S8 views must not bypass product_events' deny-anon RLS:
-- security_invoker makes them run with the QUERYING role's rights
-- (the advisor flagged all three as SECURITY DEFINER — ERROR), and
-- the belt-and-braces revoke keeps PostgREST roles out entirely
-- (these views are read via service role / the SQL editor only).
--
-- Applied to prod (vpwnpxowqflajvqpgvyb) via MCP 2026-07-08 and
-- recorded in _pearloom_migrations; advisors back to the single
-- known deliberate INFO.
alter view public.first_session_funnel set (security_invoker = true);
alter view public.whispers_feed        set (security_invoker = true);
alter view public.client_errors_feed   set (security_invoker = true);

revoke all on public.first_session_funnel from anon, authenticated;
revoke all on public.whispers_feed        from anon, authenticated;
revoke all on public.client_errors_feed   from anon, authenticated;
