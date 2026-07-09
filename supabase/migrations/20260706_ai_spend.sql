-- ─────────────────────────────────────────────────────────────
-- 20260706_ai_spend.sql — Per-account daily AI dollar cap
--
-- Today AI usage is METERED for observability (src/lib/ai-usage.ts)
-- but never ENFORCED — a compromised token or a runaway client loop
-- can run up unbounded model spend. This table is the persistent,
-- cross-instance counter behind a per-account (or per-IP) daily cap
-- (see src/lib/ai-budget.ts).
--
-- One row per (email, day). `email` is the budget KEY: the caller's
-- account email when authenticated, else `ip:<addr>` for anonymous /
-- guest AI callers (so anonymous abuse is still bounded). `cents` is
-- the running sum of ESTIMATED AI cost (via ai-usage.estimateCostUsd)
-- charged so far today. `day` is the UTC calendar day.
--
-- Belt-and-braces RLS: restrictive deny-anon; all reads/writes go
-- through the service-role client in src/lib/ai-budget.ts
-- (CLAUDE-DESIGN §12). No client ever touches this table directly.
--
-- APPLIED to prod (project vpwnpxowqflajvqpgvyb) 2026-07-06 via
-- Supabase MCP + recorded in _pearloom_migrations. Idempotent —
-- safe to re-run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.ai_spend (
  email text not null,
  day date not null,
  cents integer not null default 0,
  updated_at timestamptz default now(),
  primary key (email, day)
);

alter table public.ai_spend enable row level security;

drop policy if exists "ai_spend_deny_anon" on public.ai_spend;
create policy "ai_spend_deny_anon"
  on public.ai_spend
  as restrictive
  for all
  to anon
  using (false);

-- Atomic upsert-increment for chargeAi(). Adds `p_cents` to today's
-- counter, creating the row on first charge of the day. Expressed as
-- a function so the increment is a single atomic statement (the JS
-- client's .upsert() can only SET, not add). security definer so a
-- future non-service caller can't be relied upon; service-role
-- already bypasses RLS.
create or replace function public.increment_ai_spend(
  p_email text,
  p_day date,
  p_cents integer
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ai_spend (email, day, cents, updated_at)
  values (p_email, p_day, p_cents, now())
  on conflict (email, day)
  do update set cents = ai_spend.cents + excluded.cents,
                updated_at = now();
$$;

-- The RPC is only ever called by the service-role client (ai-budget.ts),
-- which bypasses grants. Exposing a SECURITY DEFINER increment to
-- anon/authenticated via /rest/v1/rpc would let anyone inflate any
-- account's daily counter (a lockout griefing vector — Supabase
-- security advisor 0028/0029). Revoke public execute.
revoke execute on function public.increment_ai_spend(text, date, integer) from public;
revoke execute on function public.increment_ai_spend(text, date, integer) from anon;
revoke execute on function public.increment_ai_spend(text, date, integer) from authenticated;
