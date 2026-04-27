-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260420_section_comments.sql
-- Section-anchored collaborator comments for multi-user edit.
-- Every row is one message in a thread attached to a block/chapter
-- id within a site. Real-time broadcast is wired via Supabase
-- Realtime postgres_changes on this table.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.section_comments (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  section_id  text not null, -- block id OR chapter id OR section slug
  author_email text not null,
  author_name text,
  body        text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  resolved    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists section_comments_site_section_idx
  on public.section_comments(site_id, section_id, created_at);

create index if not exists section_comments_open_idx
  on public.section_comments(site_id)
  where resolved = false;

alter table public.section_comments enable row level security;

-- NOTE: RLS policies are enforced at the API layer (service-role
-- client + explicit ownership/co-host check). The row-level policy
-- below is a belt-and-braces deny-all for anon access.
drop policy if exists "section_comments_deny_anon" on public.section_comments;
create policy "section_comments_deny_anon"
  on public.section_comments
  as restrictive
  for all
  to anon
  using (false);
