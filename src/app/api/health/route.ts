// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/health/route.ts
//
// Health-check endpoint for monitoring, alerting, and load
// balancer probes. Intentionally unauthenticated.
//
// Response shape:
//   {
//     status:    'ok' | 'degraded' | 'down',
//     version:   <semver from package.json>,
//     uptime:    <process.uptime() seconds>,
//     timestamp: <ISO>,
//     checks: {
//       supabase: { ok, latencyMs, error? },
//       env: { anthropic, gemini, openai, resend, stripe, sentry }
//     },
//     recentErrors: <count from in-memory ring>
//   }
//
// Status semantics:
//   • down     — Supabase probe failed. The app can't persist;
//                page someone.
//   • degraded — Supabase ok but an OPTIONAL integration env var
//                is missing (e.g., RESEND_API_KEY) — emails won't
//                send but the core flow works.
//   • ok       — Supabase ok + every documented env var present.
//
// HTTP:
//   • 200 on ok + degraded (the app is serving traffic)
//   • 503 on down (load balancers drop the instance)
//
// Memoization:
//   The Supabase probe runs at most once per 30s — Vercel cron
//   + Sentry uptime probes + Datadog synthetics all poll on
//   sub-minute intervals; we don't want to hammer the DB.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { countRecentErrors } from '@/lib/error-tracking';

export const dynamic = 'force-dynamic';

const APP_VERSION = process.env.npm_package_version ?? '0.1.0';

interface SupabaseProbe {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

interface EnvChecks {
  anthropic: boolean;
  gemini: boolean;
  openai: boolean;
  resend: boolean;
  stripe: boolean;
  sentry: boolean;
}

const PROBE_TTL_MS = 30_000;
let cachedProbe: { at: number; result: SupabaseProbe } | null = null;

async function probeSupabase(): Promise<SupabaseProbe> {
  const now = Date.now();
  if (cachedProbe && now - cachedProbe.at < PROBE_TTL_MS) {
    return cachedProbe.result;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const result: SupabaseProbe = {
      ok: false,
      latencyMs: 0,
      error: 'Supabase env vars not configured',
    };
    cachedProbe = { at: now, result };
    return result;
  }
  const start = performance.now();
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    // Lightweight head-only count — zero data transfer. PostgREST
    // returns the table existence + an exact row count. We don't
    // care about the count value, only that the request succeeded.
    const { error } = await supabase
      .from('sites')
      .select('id', { head: true, count: 'exact' })
      .limit(0);
    const latencyMs = Math.round(performance.now() - start);
    if (error) {
      const result: SupabaseProbe = {
        ok: false,
        latencyMs,
        error: error.message,
      };
      cachedProbe = { at: now, result };
      return result;
    }
    const result: SupabaseProbe = { ok: true, latencyMs };
    cachedProbe = { at: now, result };
    return result;
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const result: SupabaseProbe = {
      ok: false,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
    cachedProbe = { at: now, result };
    return result;
  }
}

function envChecks(): EnvChecks {
  return {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    gemini: Boolean(
      process.env.GEMINI_API_KEY
        || process.env.GOOGLE_AI_KEY
        || process.env.GOOGLE_API_KEY,
    ),
    openai: Boolean(process.env.OPENAI_API_KEY),
    resend: Boolean(process.env.RESEND_API_KEY),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    sentry: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  };
}

export async function GET() {
  const [supabase, env] = await Promise.all([
    probeSupabase(),
    Promise.resolve(envChecks()),
  ]);

  // Status calculation:
  //   • down     — Supabase failed
  //   • degraded — Supabase ok but anthropic / gemini / resend
  //                missing (these are CORE — sites can't generate
  //                without AI keys, emails can't send without resend)
  //   • ok       — everything documented + Supabase up
  // Sentry + Stripe absence doesn't degrade (Sentry is observability
  // only; Stripe is monetization-only and dev envs often skip it).
  const coreOptional = [env.anthropic, env.gemini, env.resend];
  const hasAllCore = coreOptional.every(Boolean);

  const status: 'ok' | 'degraded' | 'down' = !supabase.ok
    ? 'down'
    : hasAllCore
      ? 'ok'
      : 'degraded';

  const body = {
    status,
    version: APP_VERSION,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: { supabase, env },
    recentErrors: countRecentErrors(),
  };

  // 503 only when truly down. Degraded still returns 200 — the
  // app is serving traffic, monitors just have a yellow signal.
  return NextResponse.json(body, {
    status: status === 'down' ? 503 : 200,
    headers: {
      'cache-control': 'no-store',
      // Hint to monitors: include the status in a custom header so
      // they can alert without parsing JSON.
      'x-health-status': status,
    },
  });
}
