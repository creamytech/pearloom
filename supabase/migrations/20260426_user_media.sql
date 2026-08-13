-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260426_user_media.sql
--
-- User-scoped media library. Every photo a user uploads — wizard,
-- dashboard Gallery, editor drop, invite designer — gets a row
-- here. It lives outside any single site so the user can re-use
-- a photo across multiple celebrations without re-uploading.
--
-- `source_site_id` records where the photo was first uploaded
-- (used for "photos from Alex & Jamie's wedding" filters); null
-- when uploaded directly into the library.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.user_media (
  id             uuid primary key default gen_random_uuid(),
  owner_email    text not null,
  url            text not null,
  width          integer,
  height         integer,
  mime_type      text,
  filename       text,
  caption        text,
  taken_at       timestamptz,
  source         text not null default 'upload' check (source in ('upload', 'google', 'wizard', 'editor', 'invite')),
  source_site_id text,
  created_at     timestamptz not null default now()
);

create index if not exists user_media_owner_idx
  on public.user_media(owner_email, created_at desc);

create index if not exists user_media_site_idx
  on public.user_media(source_site_id);

alter table public.user_media enable row level security;

drop policy if exists "user_media_deny_anon" on public.user_media;
create policy "user_media_deny_anon"
  on public.user_media
  as restrictive
  for all
  to anon
  using (false);
