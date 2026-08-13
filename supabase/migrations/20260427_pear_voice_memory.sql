-- ─────────────────────────────────────────────────────────────
-- 2026-04-27 · Pear voice samples + persistent memory
--
-- Lets a host record a 60-second voice memo that we transcribe and
-- store; subsequent AI drafts reference the cadence/vocabulary so
-- generated copy reads in the host's actual voice instead of generic
-- editorial.
--
-- Memories are free-form notes ("we liked the candles at Olive's
-- wedding") that persist across sessions and weave into vendor
-- briefs, decor prompts, invitation copy.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.pear_voice_samples (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  site_id text,
  transcript text not null,
  audio_url text,
  -- Token-level vocabulary cache so we don't re-tokenize on every
  -- AI call. Light-touch — most useful for "banned phrases" lookups.
  vocab_summary text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists pear_voice_samples_user_idx on public.pear_voice_samples (user_email);
create index if not exists pear_voice_samples_site_idx on public.pear_voice_samples (site_id);

alter table public.pear_voice_samples enable row level security;

drop policy if exists "pear_voice_samples_deny_anon" on public.pear_voice_samples;
create policy "pear_voice_samples_deny_anon"
  on public.pear_voice_samples
  as restrictive
  for all
  to anon
  using (false);

create table if not exists public.pear_memories (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  site_id text,
  -- Free-form note text in the host's words.
  content text not null,
  -- 'voice' (transcribed memo), 'manual' (typed note), 'edit'
  -- (auto-extracted from a manifest edit), 'ai' (Pear inferred).
  source text not null default 'manual',
  -- Lightweight tags for retrieval ("vendor", "decor", "tone", "venue").
  tags text[] default array[]::text[],
  created_at timestamptz not null default now(),
  -- Soft-delete so undo is cheap.
  archived boolean not null default false
);

create index if not exists pear_memories_user_idx on public.pear_memories (user_email);
create index if not exists pear_memories_site_idx on public.pear_memories (site_id);
create index if not exists pear_memories_active_idx on public.pear_memories (user_email, archived, created_at desc);

alter table public.pear_memories enable row level security;

drop policy if exists "pear_memories_deny_anon" on public.pear_memories;
create policy "pear_memories_deny_anon"
  on public.pear_memories
  as restrictive
  for all
  to anon
  using (false);
