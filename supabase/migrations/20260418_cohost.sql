-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260418_cohost.sql
-- Co-host collaboration schema.
--
-- cohost_invites  : outstanding invite links minted by creators
-- cohosts         : active collaborators after an invite accept
-- ─────────────────────────────────────────────────────────────

create table if not exists public.cohost_invites (
  token         text primary key,
  site_id       uuid not null references public.sites(id) on delete cascade,
  role          text not null check (role in ('editor','guest-manager','viewer')),
  invited_by    text not null,
  note          text,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '14 days'),
  accepted_at   timestamptz,
  accepted_email text
);

create index if not exists cohost_invites_site_idx on public.cohost_invites(site_id);
create index if not exists cohost_invites_open_idx on public.cohost_invites(site_id) where accepted_at is null;

create table if not exists public.cohosts (
  site_id    uuid not null references public.sites(id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('editor','guest-manager','viewer')),
  invited_by text,
  joined_at  timestamptz not null default now(),
  primary key (site_id, email)
);

create index if not exists cohosts_email_idx on public.cohosts(email);

-- Grant reads to the role used by the service role client. RLS is
-- enforced at the API layer (service-role key is already owner-check
-- gated in src/app/api/sites/co-host/route.ts).
alter table public.cohost_invites enable row level security;
alter table public.cohosts enable row level security;
