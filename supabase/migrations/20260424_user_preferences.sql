-- Pearloom / user_preferences
--
-- Stores per-user dashboard preferences: Pear voice (tone of
-- her drafts), autonomy levels (how much she can do alone per
-- category), quiet hours, and optional profile fields that
-- aren't part of the NextAuth session (pronouns, timezone,
-- display name override).
--
-- Keyed by email to match the rest of the auth model. Row is
-- created lazily on first PATCH; GET returns sensible defaults
-- when no row exists yet.

create table if not exists public.user_preferences (
  email           text primary key,
  voice           text not null default 'gentle'
                    check (voice in ('gentle', 'candid', 'witty', 'minimal')),
  quiet_hours     boolean not null default true,
  autonomy        jsonb not null default jsonb_build_object(
                    'draft_emails',    2,
                    'call_vendors',    1,
                    'update_site',     3,
                    'respond_guest',   2,
                    'adjust_schedule', 1
                  ),
  display_name    text,
  pronouns        text,
  timezone        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Touch updated_at on any update.
create or replace function public.touch_user_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists touch_user_preferences_updated on public.user_preferences;
create trigger touch_user_preferences_updated
  before update on public.user_preferences
  for each row
  execute function public.touch_user_preferences_updated_at();

-- Belt-and-braces: this table is only written by the API route
-- using the service-role client. Bare anon keys cannot read or
-- write — see CLAUDE-DESIGN.md §14.3 for the pattern.
alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_deny_anon" on public.user_preferences;
create policy "user_preferences_deny_anon"
  on public.user_preferences
  as restrictive
  for all
  to anon
  using (false);
