-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260706_product_events.sql — the activation event
-- spine (GRAND-PLAN Pillar 20).
--
-- Pearloom had ZERO host-funnel analytics: POST /api/sites fired
-- nothing on create or publish, welcome/wizard drop-off lived in
-- local state, and published-state hid inside the ai_manifest
-- JSONB. This adds a lightweight FIRST-PARTY event table — the
-- same pattern the codebase already uses (site_analytics,
-- welcome_emails, guests.invite_opened_at) — plus a real
-- sites.published_at column so the funnel can be computed without
-- JSONB spelunking.
--
--   product_events — one row per funnel event. `event` is the
--     canonical name ('signed_up' | 'welcome_completed' |
--     'site_created' | 'site_published' | 'first_rsvp_received' |
--     'keepsake_generated'), plus client beacons (wizard_started,
--     wizard_step, welcome_started, welcome_step). email/site_id
--     are optional (landing → signup is anonymous). props is
--     free-form JSONB. Writes go through the service-role client
--     only (src/lib/analytics/product-events.ts) — fire-and-forget,
--     failure-tolerant; a telemetry write NEVER blocks a request.
--
--   sites.published_at — promoted out of ai_manifest JSONB. The
--     FIRST publish stamps it (publishSite in src/lib/db.ts);
--     re-publish leaves it. Clean analytics + a real column for
--     the funnel view (20260706_activation_view.sql). Additive +
--     nullable: zero impact on existing rows or the publish path.
--
-- Belt-and-braces RLS: restrictive deny-anon (CLAUDE-DESIGN §12),
-- copied verbatim from 20260703_gift_pledges.sql. Service-role
-- writes only; no client reads or writes this table directly.
--
-- APPLIED to prod (project vpwnpxowqflajvqpgvyb) 2026-07-06 via
-- Supabase MCP + recorded in _pearloom_migrations. Idempotent —
-- safe to re-run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.product_events (
  id         uuid primary key default gen_random_uuid(),
  event      text not null,
  email      text,
  site_id    text,
  props      jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_events_event_created_idx
  on public.product_events (event, created_at);
create index if not exists product_events_email_idx
  on public.product_events (email);

alter table public.product_events enable row level security;

drop policy if exists "product_events_deny_anon" on public.product_events;
create policy "product_events_deny_anon"
  on public.product_events
  as restrictive
  for all
  to anon
  using (false);

-- Promote published_at out of the ai_manifest JSONB — clean
-- analytics + ends the spelunking (also helps Pillar 15).
alter table public.sites
  add column if not exists published_at timestamptz;
