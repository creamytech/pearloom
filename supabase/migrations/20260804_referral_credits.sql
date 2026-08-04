-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260804_referral_credits.sql
-- The referral reward ledger (docs/DECISIONS-2026-08-04 §1).
--
-- Guest→host is the product's growth thesis: weddings are episodic,
-- so only a GUEST becoming the next host compounds. Attribution
-- already ships (`referredBy` on the site_created product event);
-- this is where the REWARD is recorded.
--
-- What's granted: +1 year of full-resolution archive to the
-- REFERRER, capped at 3 (lib/referral-reward). Archive only — never
-- Pass or Keepsake features, which would cannibalise what we sell.
-- The new host's reward is inheriting the look of the site they came
-- from, which needs no ledger.
--
-- One row per (referrer, new site): the unique constraint is the
-- idempotency guard, so a replayed webhook or a double-publish can
-- never grant twice.
--
-- Belt-and-braces RLS: restrictive deny-anon; all reads/writes go
-- through owner-gated service-role routes (CLAUDE-DESIGN §12).
--
-- NOT YET APPLIED TO PROD — apply via Supabase MCP and record in
-- _pearloom_migrations. Every code path degrades gracefully while
-- the table is absent (grantReferralCredit no-ops and logs), so
-- shipping ahead of the apply is safe.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.referral_credits (
  id                uuid primary key default gen_random_uuid(),
  -- Who earns the archive year.
  referrer_email    text not null,
  -- The site whose passport produced the referral (attribution is a
  -- SITE, never a guest — a referral link gets forwarded).
  referring_slug    text not null,
  -- The site the new host published. Activation, not signup.
  new_site_slug     text not null,
  new_host_email    text not null,
  archive_years     integer not null default 1 check (archive_years between 0 and 3),
  created_at        timestamptz not null default now(),

  -- Idempotency: one grant per new site, ever.
  constraint referral_credits_unique_new_site unique (new_site_slug),
  -- Self-referral is refused in code; refused here too, so a bug
  -- upstream can't quietly pay someone for inviting themselves.
  constraint referral_credits_no_self_referral check (lower(referrer_email) <> lower(new_host_email))
);

create index if not exists referral_credits_referrer_idx
  on public.referral_credits (lower(referrer_email), created_at desc);

alter table public.referral_credits enable row level security;

drop policy if exists "referral_credits_deny_anon" on public.referral_credits;
create policy "referral_credits_deny_anon"
  on public.referral_credits as restrictive for all to anon using (false);
