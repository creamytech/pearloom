-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260423_event_os_submissions.sql
-- Multi-guest-visible state for the four event-OS interactive
-- blocks that currently keep their data in localStorage:
--   • adviceWall   → tribute_submissions
--   • activityVote → activity_votes
--   • toastSignup  → toast_signups
--   • packingList  → (stays localStorage — inherently per-guest)
--
-- Each table is append-only with a per-site scope and a
-- belt-and-braces restrictive deny-anon policy; writes go through
-- service-role API routes only.
--
-- See CLAUDE-PRODUCT.md §6.7 for the strategic plan.
-- ─────────────────────────────────────────────────────────────

-- ── tribute_submissions — advice / tribute / memory wall ─────
create table if not exists public.tribute_submissions (
  id          uuid primary key default gen_random_uuid(),
  site_id     text not null,
  block_id    text not null,
  author_name text not null check (char_length(author_name) between 1 and 80),
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now(),
  /** Host moderation state. Default 'approved' so MVP is open;
      hosts can flip to 'hidden' from the dashboard later. */
  state       text not null default 'approved' check (state in ('approved', 'hidden', 'flagged'))
);

create index if not exists tribute_submissions_site_block_idx
  on public.tribute_submissions(site_id, block_id, created_at desc);

alter table public.tribute_submissions enable row level security;

drop policy if exists "tribute_submissions_deny_anon" on public.tribute_submissions;
create policy "tribute_submissions_deny_anon"
  on public.tribute_submissions
  as restrictive
  for all
  to anon
  using (false);

-- ── activity_votes — multi-choice polls ──────────────────────
create table if not exists public.activity_votes (
  id          uuid primary key default gen_random_uuid(),
  site_id     text not null,
  block_id    text not null,
  option_id   text not null,
  voter_key   text not null, -- stable per-browser anon id (localStorage)
  created_at  timestamptz not null default now(),
  unique (site_id, block_id, voter_key)
);

create index if not exists activity_votes_site_block_idx
  on public.activity_votes(site_id, block_id);

alter table public.activity_votes enable row level security;

drop policy if exists "activity_votes_deny_anon" on public.activity_votes;
create policy "activity_votes_deny_anon"
  on public.activity_votes
  as restrictive
  for all
  to anon
  using (false);

-- ── toast_signups — slot claims ──────────────────────────────
create table if not exists public.toast_signups (
  id          uuid primary key default gen_random_uuid(),
  site_id     text not null,
  block_id    text not null,
  slot_index  integer not null,
  claimed_by  text not null check (char_length(claimed_by) between 1 and 80),
  created_at  timestamptz not null default now(),
  unique (site_id, block_id, slot_index)
);

create index if not exists toast_signups_site_block_idx
  on public.toast_signups(site_id, block_id);

alter table public.toast_signups enable row level security;

drop policy if exists "toast_signups_deny_anon" on public.toast_signups;
create policy "toast_signups_deny_anon"
  on public.toast_signups
  as restrictive
  for all
  to anon
  using (false);
