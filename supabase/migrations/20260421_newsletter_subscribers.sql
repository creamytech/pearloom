-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260421_newsletter_subscribers.sql
-- Marketing newsletter capture for the footer signup form.
-- Append-only log with lower(email) unique so repeat signups
-- from the same address don't double-insert.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  email_lower text generated always as (lower(email)) stored,
  source      text not null default 'marketing_footer',
  -- Light anti-abuse signal: the raw IP prefix + UA hash so we can
  -- tell apart "lots of signups from one box" without storing PII
  -- beyond what a request already reveals.
  ip_prefix   text,
  ua_hash     text,
  created_at  timestamptz not null default now(),
  confirmed_at timestamptz
);

create unique index if not exists newsletter_subscribers_email_unique
  on public.newsletter_subscribers(email_lower);

create index if not exists newsletter_subscribers_created_idx
  on public.newsletter_subscribers(created_at desc);

alter table public.newsletter_subscribers enable row level security;

-- Deny anon; inserts go through the service-role API route.
drop policy if exists "newsletter_subscribers_deny_anon" on public.newsletter_subscribers;
create policy "newsletter_subscribers_deny_anon"
  on public.newsletter_subscribers
  as restrictive
  for all
  to anon
  using (false);
