-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260706_email_opt_outs.sql
-- Per-recipient email opt-out / suppression list.
--
-- Fills the gap `site_email_prefs` can't: that table is SITE-level
-- per-channel (anniversary / milestone / product). This one is
-- keyed by the RECIPIENT's email, so a guest who taps the one-click
-- List-Unsubscribe link (RFC 8058) on any invite is suppressed for
-- that site's future guest-facing sends.
--
--   • site_id set  → opt-out scoped to one site (one couple's mail).
--   • site_id NULL → global opt-out (all Pearloom mail to that
--                    address — e.g. a spam complaint via webhook).
--
-- Written only by the service role (the /unsubscribe route + the
-- Resend complaint webhook). Read before every guest-facing send by
-- src/lib/email/suppression.ts. deny-anon RLS, belt-and-braces.
--
-- NOTE: not yet applied to prod (project vpwnpxowqflajvqpgvyb) —
-- apply via the Supabase MCP + record in _pearloom_migrations.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.email_opt_outs (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  site_id    uuid references public.sites(id) on delete cascade,
  channel    text,
  created_at timestamptz not null default now()
);

-- One row per (email, site, channel). COALESCE keeps the uniqueness
-- meaningful across NULL site_id / channel (a global opt-out can't be
-- inserted twice) without depending on PG15 NULLS NOT DISTINCT.
create unique index if not exists email_opt_outs_uniq_idx
  on public.email_opt_outs (
    email,
    coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(channel, '')
  );

-- The send-time lookup is `email in (…) [+ site match]`.
create index if not exists email_opt_outs_email_idx
  on public.email_opt_outs (email);

alter table public.email_opt_outs enable row level security;
drop policy if exists "email_opt_outs_deny_anon" on public.email_opt_outs;
create policy "email_opt_outs_deny_anon"
  on public.email_opt_outs as restrictive for all to anon using (false);
