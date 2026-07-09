-- ─────────────────────────────────────────────────────────────
-- Guestbook → guest attribution
--
-- Adds a guest_id column to public.guestbook so entries written
-- by an identified guest (came in via /g/[token] or ?g=<token>)
-- get tagged with their pearloom_guests.id at insert time. This
-- closes the last loop in the per-guest "Words you wrote" feed
-- on /g/[token]: guestbook entries can now be filtered by
-- guest_id alongside memory_prompts / whispers / song_requests
-- / time_capsule.
--
-- Backwards compatible: existing rows get NULL guest_id, and the
-- column is nullable (anonymous / drive-by guestbook entries
-- still allowed). FK is `on delete set null` so deleting a
-- pearloom_guests row doesn't lose the guestbook history.
-- ─────────────────────────────────────────────────────────────

alter table public.guestbook
  add column if not exists guest_id uuid references public.pearloom_guests(id) on delete set null;

create index if not exists guestbook_guest_idx
  on public.guestbook(guest_id)
  where guest_id is not null;
