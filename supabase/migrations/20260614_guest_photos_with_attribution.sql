-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260614_guest_photos_with_attribution.sql
-- Backfill the missing guest_photos table + attribution.
--
-- /api/guest-photos and the LivePhotoWall component referenced
-- this table for months but it had never been created. Adding
-- it now WITH the guest_id attribution column so the new
-- /sites/[domain]/upload?t=<token> flow stamps photos with the
-- pearloom_guests row they came from.
--
-- /g/[token] reads guest_id to render "your contributions"
-- (photos you sent + gifts you claimed) — the personal page
-- becomes a real hub instead of just a one-time RSVP gateway.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.guest_photos (
  id              uuid primary key default gen_random_uuid(),
  -- site_id is the subdomain string (matches /api/guest-photos
  -- which accepts the slug). Not a FK to sites.id.
  site_id         text not null,
  uploader_name   text not null,
  guest_id        uuid references public.pearloom_guests(id) on delete set null,
  url             text not null,
  thumbnail_url   text,
  caption         text,
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  created_at      timestamptz not null default now()
);

create index if not exists guest_photos_site_status_idx
  on public.guest_photos (site_id, status, created_at desc);

create index if not exists guest_photos_guest_idx
  on public.guest_photos (guest_id, created_at desc)
  where guest_id is not null;

alter table public.guest_photos enable row level security;
drop policy if exists "guest_photos_deny_anon" on public.guest_photos;
create policy "guest_photos_deny_anon"
  on public.guest_photos as restrictive for all to anon using (false);
