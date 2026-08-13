-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260619_welcome_emails.sql
-- Welcome-email dedupe ledger.
--
-- NextAuth runs JWT-only (no adapter), so there's no isNewUser
-- signal on sign-in. lib/email/welcome.ts upserts here with
-- ignoreDuplicates — the first insert wins the one welcome
-- email; every later sign-in is a no-op.
--
-- Belt-and-braces RLS: deny anon entirely (restrictive policy)
-- per CLAUDE-DESIGN.md §14.3. Writes go through the service-role
-- key in the auth event handler only.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.welcome_emails (
  email    text primary key,
  sent_at  timestamptz not null default now()
);

alter table public.welcome_emails enable row level security;

drop policy if exists "welcome_emails_deny_anon" on public.welcome_emails;
create policy "welcome_emails_deny_anon"
  on public.welcome_emails
  as restrictive
  for all
  to anon
  using (false);
