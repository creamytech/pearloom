-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260620_notifications.sql
-- Host notification system: server-side read state, per-host
-- channel preferences, host web-push subscriptions, a send log
-- (dedupe for instant alerts + daily digests), and the
-- scheduled_emails table lib/email-sequences.ts has referenced
-- since launch but no migration ever created.
--
-- All tables follow the belt-and-braces deny-anon RLS pattern
-- (CLAUDE-DESIGN.md §14.3): reads/writes go through the
-- service-role client in API routes only.
-- ─────────────────────────────────────────────────────────────

-- ── Bell read state ──────────────────────────────────────────
-- One row per (host, site): when did this host last open the
-- bell? Replaces the localStorage-only "seen" timestamp so the
-- unread count survives across devices.
create table if not exists public.notification_reads (
  user_email    text not null,
  site_id       text not null,
  last_seen_at  timestamptz not null default now(),
  primary key (user_email, site_id)
);

alter table public.notification_reads enable row level security;
drop policy if exists "notification_reads_deny_anon" on public.notification_reads;
create policy "notification_reads_deny_anon"
  on public.notification_reads as restrictive for all to anon using (false);

-- ── Per-host channel preferences ─────────────────────────────
-- email_mode: 'instant' | 'digest' | 'off'. Categories are the
-- product taxonomy in src/lib/notifications/prefs.ts (replies /
-- declines / gifts / content / cohost). Missing rows fall back
-- to the per-category defaults in code.
create table if not exists public.user_notification_prefs (
  user_email    text not null,
  category      text not null,
  email_mode    text not null default 'digest'
                check (email_mode in ('instant', 'digest', 'off')),
  push_enabled  boolean not null default false,
  updated_at    timestamptz not null default now(),
  primary key (user_email, category)
);

alter table public.user_notification_prefs enable row level security;
drop policy if exists "user_notification_prefs_deny_anon" on public.user_notification_prefs;
create policy "user_notification_prefs_deny_anon"
  on public.user_notification_prefs as restrictive for all to anon using (false);

-- ── Host web-push subscriptions ──────────────────────────────
-- Mirror of guest_push_subscriptions for HOSTS (dashboard).
-- One row per browser endpoint; a host can have several
-- (laptop + phone). Pruned on 404/410 from the push service.
create table if not exists public.host_push_subscriptions (
  endpoint    text primary key,
  user_email  text not null,
  keys        jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_host_push_user on public.host_push_subscriptions(user_email);

alter table public.host_push_subscriptions enable row level security;
drop policy if exists "host_push_subscriptions_deny_anon" on public.host_push_subscriptions;
create policy "host_push_subscriptions_deny_anon"
  on public.host_push_subscriptions as restrictive for all to anon using (false);

-- ── Notification send log ────────────────────────────────────
-- Append-only dedupe ledger: one row per (channel, dedupe_key)
-- send. Guards instant alerts against webhook retries and the
-- daily digest against double-sends ('digest:{site}:{date}').
create table if not exists public.notification_log (
  id              uuid primary key default gen_random_uuid(),
  dedupe_key      text not null,
  channel         text not null,            -- 'email' | 'push' | 'digest'
  site_id         text,
  recipient_email text not null,
  category        text,
  sent_at         timestamptz not null default now(),
  unique (channel, dedupe_key)
);

create index if not exists idx_notification_log_site on public.notification_log(site_id);

alter table public.notification_log enable row level security;
drop policy if exists "notification_log_deny_anon" on public.notification_log;
create policy "notification_log_deny_anon"
  on public.notification_log as restrictive for all to anon using (false);

-- ── scheduled_emails (backfill) ──────────────────────────────
-- lib/email-sequences.ts (scheduleEmail / processScheduledEmails
-- + /api/cron/email) has read and written this table since the
-- email-sequence engine shipped, but no migration ever created
-- it. Shape matches the ScheduledEmail interface exactly.
create table if not exists public.scheduled_emails (
  id              uuid primary key default gen_random_uuid(),
  site_id         text not null,
  email_type      text not null,
  recipient_email text not null,
  recipient_name  text,
  context         jsonb not null default '{}'::jsonb,
  send_at         timestamptz not null,
  sent_at         timestamptz,
  status          text not null default 'pending'
                  check (status in ('pending', 'sent', 'failed')),
  error           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_scheduled_emails_due
  on public.scheduled_emails(send_at) where status = 'pending';
create index if not exists idx_scheduled_emails_site on public.scheduled_emails(site_id);

alter table public.scheduled_emails enable row level security;
drop policy if exists "scheduled_emails_deny_anon" on public.scheduled_emails;
create policy "scheduled_emails_deny_anon"
  on public.scheduled_emails as restrictive for all to anon using (false);
