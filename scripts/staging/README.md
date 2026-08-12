# The Pearloom staging stack

A full local replica of the production runtime — the real Next.js app
talking the real `@supabase/*` client grammar to a real Postgres —
with no Supabase account, no Docker, and no cloud anything. This is
the environment the 2026-08-12 new-user simulation ran on
(`docs/NEW-USER-REVAMP.md`) and the one the `staging-fence` CI
workflow rebuilds from scratch on every PR.

## The three pieces

| Piece | What | Where |
|---|---|---|
| Postgres 16 | A plain local Postgres; the schema is built by `npm run db:migrate` from `supabase/migrations/` **alone** — if a hand patch is ever needed, that's a missing migration (file it). | `127.0.0.1:5432`, db `pearloom`, password `pearloom` (all overridable via `PG*` env) |
| `pearlrest.mjs` | PostgREST + Supabase-Storage emulator on `:54321`. Speaks the exact grammar subset `@supabase/postgrest-js` / `storage-js` emit (JSON-path selects/filters, embeds, upsert `on_conflict`, HEAD counts, single-object 406, RPC, file-backed storage). Unknown grammar **fails loudly** (500 + a line in `.data/pearlrest.log`) so a staging gap can never masquerade as product behavior. | `npm run staging:rest` |
| The app | `next dev -p 3001` pointed at the emulator via `.env.local`. | see below |

## Bring-up

```bash
# 1. schema — empty Postgres in, working database out
npm run db:migrate

# 2. the REST/storage emulator
npm run staging:rest &

# 3. the app
cat > .env.local <<'ENV'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_local_sim
SUPABASE_SERVICE_ROLE_KEY=sb_secret_local_sim
NEXTAUTH_SECRET=pearloom-sim-nextauth-secret
NEXTAUTH_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3001
SITE_GATE_ENABLED=false
PEARLOOM_E2E=1
E2E_TEST_USER_EMAIL=e2e@pearloom.test
E2E_TEST_USER_PASSWORD=pearloom-e2e-secret
ENV
npx next dev -p 3001
```

`PEARLOOM_E2E=1` registers the e2e CredentialsProvider
(`src/lib/auth.ts`) so Playwright — and you — can sign in without a
Google OAuth round-trip.

## The fence suite

The staging-critical e2e specs (`e2e/specs/doorway.spec.ts`,
`press-idempotency.spec.ts`, `publish-gate.spec.ts`) assert the
funnel contracts Sprint W repaired: the signed-out wizard doorway,
the idempotent press, and the publish gate. Run them with:

```bash
PW_EXECUTABLE_PATH=<chromium> npx playwright test --project=studio-chromium \
  e2e/specs/doorway.spec.ts e2e/specs/press-idempotency.spec.ts e2e/specs/publish-gate.spec.ts
```

CI runs exactly this in `.github/workflows/staging-fence.yml` against
a throwaway `postgres:16` service — which makes it a **migration
gate**: a PR whose migration only works because prod already had the
table (or that forgets a table code reads) goes red before merge.

## Two migration runners, on purpose

- `npm run db:migrate` → `scripts/staging/migrate.mjs` — the staging
  builder. Bootstraps Supabase-isms (anon/authenticated/service_role
  roles, `auth.jwt()` stub, pgcrypto) onto plain Postgres, then runs
  every migration in lexical order with a deferral-retry pass for
  same-day dependency inversions. Records into `_pearloom_migrations`
  (prod's shape: `filename` PK + `applied_at`).
- `npm run db:migrate:remote` → `scripts/db-migrate.ts` — the remote
  applier for a real Supabase database (`SUPABASE_DB_URL`), unchanged.

## What the emulator does NOT do

Row-level security (the app talks to Supabase with the service-role
key, so RLS is never exercised by the product either — policies are
belt-and-braces), Realtime channels (subscriptions no-op; the app's
polling fallbacks carry delivery), and auth.users (Pearloom uses
NextAuth, not Supabase Auth). R2/AI/Stripe stay env-gated off, same
as any keyless deploy.
