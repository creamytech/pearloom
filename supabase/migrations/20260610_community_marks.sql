-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260610_community_marks.sql
-- Community marketplace for AI-painted decor.
--
-- Hosts opt their generated marks (stamps, dividers, footers,
-- accents, plus full megasheets) into a shared library. Other
-- hosts with similar palettes / occasions browse + reuse for
-- free — Pearloom doesn't pay the painter API again for their
-- session.
--
-- Design notes:
--   • opt-in only. The default state on every newly-painted
--     mark is `state = 'private'`; the host explicitly clicks
--     "Share with the community" to flip to `pending`.
--   • Moderation gate. After flip, an admin (or auto-classifier
--     once one exists) moves to `approved` or `rejected`.
--   • palette_hash is a SHA-256 of the sorted-then-joined hex
--     values, so "two hosts with the same palette" matches even
--     when their hex order differs. Indexed for the browse query
--     "hosts with similar palette to mine".
--   • downloads tracked per-mark so popular pieces sort to the
--     top of the browse view without a separate counter table.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.community_marks (
  id              uuid primary key default gen_random_uuid(),
  -- Owner — the host who painted the mark. Used so they can
  -- un-share later without admin help.
  owner_email     text not null,
  -- The mark itself.
  asset_url       text not null,
  -- 'stamp' | 'divider' | 'footer' | 'accent' | 'confetti' | 'megasheet'.
  -- 'megasheet' is special: asset_url points at the full sheet,
  -- and 12 child rows (one per cell) are inserted alongside,
  -- linked via parent_id.
  kind            text not null check (kind in (
    'stamp', 'divider', 'footer', 'accent', 'confetti', 'megasheet'
  )),
  -- For megasheet children — the cell key (e.g. 'stamp:travel').
  cell_key        text,
  -- Parent megasheet, if this row is a sliced cell.
  parent_id       uuid references public.community_marks(id) on delete cascade,
  -- Context the mark was painted for. Drives the "matches your
  -- palette + occasion" suggestion query.
  occasion        text,
  vibe_tags       text[] default array[]::text[],
  -- Sorted SHA-256 of the palette hex set so palette matches are
  -- order-independent.
  palette_hash    text,
  -- The hex values themselves so the UI can show palette swatches
  -- without a join table.
  palette_hex     text[] default array[]::text[],
  -- The prompt the painter actually used. Stored so other hosts
  -- can learn how to ask Pear for similar pieces. Optional —
  -- not every flow has the prompt available.
  source_prompt   text,
  -- Lifecycle.
  state           text not null default 'pending' check (state in (
    'pending', 'approved', 'rejected', 'private'
  )),
  -- Soft delete for un-share.
  withdrawn_at    timestamptz,
  -- Engagement.
  downloads       integer not null default 0,
  hearts          integer not null default 0,
  -- Audit.
  opt_in_at       timestamptz default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists community_marks_browse_idx
  on public.community_marks (state, kind, occasion, downloads desc)
  where state = 'approved' and withdrawn_at is null;

create index if not exists community_marks_palette_idx
  on public.community_marks (palette_hash)
  where state = 'approved' and withdrawn_at is null;

create index if not exists community_marks_owner_idx
  on public.community_marks (owner_email, state);

create index if not exists community_marks_parent_idx
  on public.community_marks (parent_id)
  where parent_id is not null;

alter table public.community_marks enable row level security;

-- Belt-and-braces deny-anon. Reads happen through the service-role
-- API route (which filters by state=approved automatically); writes
-- happen the same way. Anon keys see nothing.
drop policy if exists "community_marks_deny_anon" on public.community_marks;
create policy "community_marks_deny_anon"
  on public.community_marks
  as restrictive
  for all
  to anon
  using (false);

-- updated_at trigger reuses the shared tg_set_updated_at function
-- introduced in 20260417_legacy_bootstrap.sql.
drop trigger if exists set_community_marks_updated_at on public.community_marks;
create trigger set_community_marks_updated_at
  before update on public.community_marks
  for each row
  execute function public.tg_set_updated_at();

-- A host's "hearts" tracker — one row per (host, mark) so the
-- UI can surface "you've already hearted this." Append-only;
-- delete a row to un-heart.
create table if not exists public.community_mark_hearts (
  mark_id   uuid not null references public.community_marks(id) on delete cascade,
  user_email text not null,
  created_at timestamptz not null default now(),
  primary key (mark_id, user_email)
);

create index if not exists community_mark_hearts_user_idx
  on public.community_mark_hearts (user_email);

alter table public.community_mark_hearts enable row level security;

drop policy if exists "community_mark_hearts_deny_anon" on public.community_mark_hearts;
create policy "community_mark_hearts_deny_anon"
  on public.community_mark_hearts
  as restrictive
  for all
  to anon
  using (false);
