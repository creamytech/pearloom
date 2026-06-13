// ─────────────────────────────────────────────────────────────
// Pearloom / api/health/route.test.ts
//
// Health-check is the surface load balancers + uptime monitors
// poll on every interval. A regression that flips status: 'ok'
// to 'down' silently OR returns 200 on a Supabase outage would
// either page someone at 3am for nothing OR (worse) hide a real
// outage from the on-call.
//
// Test goals:
//   • Probe shape stable (status / version / uptime / timestamp /
//     checks / recentErrors)
//   • HTTP code reflects severity (200 on ok+degraded, 503 on down)
//   • Status calculation is correct for every combination
//   • Memoization works — second probe within 30s doesn't hit DB
//   • Env-var presence detected for every key the audit named
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  supabaseFromMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: h.supabaseFromMock }),
}));

// Helper to set up the chained query the route runs:
//   .from('sites').select('id', { head: true, count: 'exact' }).limit(0)
function mockSupabaseProbeResult(result: { error?: { message: string } | null }): void {
  h.supabaseFromMock.mockImplementation(() => ({
    select: () => ({
      limit: () => Promise.resolve({ error: result.error ?? null }),
    }),
  }));
}

// Reset the module cache between tests because the memoization
// state lives at module scope. Without this, the cached probe
// from the previous test bleeds into the next.
let routeModule: typeof import('./route');
async function freshImport() {
  vi.resetModules();
  routeModule = await import('./route');
  return routeModule;
}

const ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_AI_KEY',
  'GOOGLE_API_KEY',
  'OPENAI_API_KEY',
  'RESEND_API_KEY',
  'STRIPE_SECRET_KEY',
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

function setSupabaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
}

function setAllCoreEnv() {
  setSupabaseEnv();
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  process.env.GEMINI_API_KEY = 'test-gemini';
  process.env.RESEND_API_KEY = 're_test';
}

describe('GET /api/health — response shape', () => {
  beforeEach(() => {
    clearEnv();
    h.supabaseFromMock.mockReset();
  });

  it('returns the documented top-level fields', async () => {
    setAllCoreEnv();
    mockSupabaseProbeResult({});
    const mod = await freshImport();
    const res = await mod.GET();
    const json = await res.json();
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('version');
    expect(json).toHaveProperty('uptime');
    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('checks.supabase');
    expect(json).toHaveProperty('checks.env');
    expect(json).toHaveProperty('recentErrors');
    expect(typeof json.uptime).toBe('number');
    expect(() => new Date(json.timestamp)).not.toThrow();
  });

  it('exposes x-health-status header matching the JSON status', async () => {
    setAllCoreEnv();
    mockSupabaseProbeResult({});
    const mod = await freshImport();
    const res = await mod.GET();
    const json = await res.json();
    expect(res.headers.get('x-health-status')).toBe(json.status);
  });

  it('disables caching via cache-control: no-store', async () => {
    setAllCoreEnv();
    mockSupabaseProbeResult({});
    const mod = await freshImport();
    const res = await mod.GET();
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});

describe('GET /api/health — status calculation', () => {
  beforeEach(() => {
    clearEnv();
    h.supabaseFromMock.mockReset();
  });

  it("'ok' when Supabase probe succeeds + all core env vars present", async () => {
    setAllCoreEnv();
    mockSupabaseProbeResult({});
    const mod = await freshImport();
    const res = await mod.GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.checks.supabase.ok).toBe(true);
  });

  it("'degraded' (200) when Supabase ok but an AI key is missing", async () => {
    setSupabaseEnv();
    process.env.GEMINI_API_KEY = 'test';
    process.env.RESEND_API_KEY = 're_test';
    // ANTHROPIC missing → core incomplete → degraded
    mockSupabaseProbeResult({});
    const mod = await freshImport();
    const res = await mod.GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('degraded');
    expect(json.checks.env.anthropic).toBe(false);
  });

  it("'degraded' when Supabase ok but RESEND_API_KEY missing", async () => {
    setSupabaseEnv();
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.GEMINI_API_KEY = 'test';
    // RESEND missing
    mockSupabaseProbeResult({});
    const mod = await freshImport();
    const res = await mod.GET();
    expect((await res.json()).status).toBe('degraded');
  });

  it("STAYS 'ok' when only Sentry/Stripe are missing (those don't degrade)", async () => {
    setAllCoreEnv();
    // STRIPE_SECRET_KEY + SENTRY_DSN intentionally unset.
    mockSupabaseProbeResult({});
    const mod = await freshImport();
    const res = await mod.GET();
    const json = await res.json();
    // Sentry + Stripe absence doesn't degrade — Sentry is
    // observability-only, Stripe is monetization-only.
    expect(json.status).toBe('ok');
    expect(json.checks.env.sentry).toBe(false);
    expect(json.checks.env.stripe).toBe(false);
  });

  it("'down' + HTTP 503 when Supabase probe fails", async () => {
    setAllCoreEnv();
    mockSupabaseProbeResult({ error: { message: 'connection refused' } });
    const mod = await freshImport();
    const res = await mod.GET();
    // CRITICAL: load balancers drop the instance on 503. Without
    // this code path, a Supabase outage would be invisible.
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.status).toBe('down');
    expect(json.checks.supabase.ok).toBe(false);
    expect(json.checks.supabase.error).toBe('connection refused');
  });

  it("'down' + 503 when Supabase env vars are missing", async () => {
    clearEnv();
    process.env.ANTHROPIC_API_KEY = 'x';
    process.env.GEMINI_API_KEY = 'x';
    process.env.RESEND_API_KEY = 'x';
    // No NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
    const mod = await freshImport();
    const res = await mod.GET();
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.status).toBe('down');
    expect(json.checks.supabase.error).toMatch(/env vars not configured/i);
  });

  it("'down' + 503 when Supabase createClient throws", async () => {
    setAllCoreEnv();
    h.supabaseFromMock.mockImplementation(() => {
      throw new Error('unexpected init failure');
    });
    const mod = await freshImport();
    const res = await mod.GET();
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.checks.supabase.error).toBe('unexpected init failure');
  });
});

describe('GET /api/health — env-var detection', () => {
  beforeEach(() => {
    clearEnv();
    h.supabaseFromMock.mockReset();
  });

  it('detects all 5 Gemini env aliases (GEMINI / GOOGLE_AI_KEY / GOOGLE_API_KEY)', async () => {
    // GEMINI_API_KEY alone
    setSupabaseEnv();
    process.env.GEMINI_API_KEY = 'k';
    mockSupabaseProbeResult({});
    let mod = await freshImport();
    expect((await (await mod.GET()).json()).checks.env.gemini).toBe(true);

    // Only GOOGLE_AI_KEY
    clearEnv();
    setSupabaseEnv();
    process.env.GOOGLE_AI_KEY = 'k';
    mockSupabaseProbeResult({});
    mod = await freshImport();
    expect((await (await mod.GET()).json()).checks.env.gemini).toBe(true);

    // Only GOOGLE_API_KEY
    clearEnv();
    setSupabaseEnv();
    process.env.GOOGLE_API_KEY = 'k';
    mockSupabaseProbeResult({});
    mod = await freshImport();
    expect((await (await mod.GET()).json()).checks.env.gemini).toBe(true);

    // None of the three
    clearEnv();
    setSupabaseEnv();
    mockSupabaseProbeResult({});
    mod = await freshImport();
    expect((await (await mod.GET()).json()).checks.env.gemini).toBe(false);
  });

  it('detects either SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN as configured', async () => {
    setAllCoreEnv();
    process.env.SENTRY_DSN = 'https://x@sentry.io/y';
    mockSupabaseProbeResult({});
    let mod = await freshImport();
    expect((await (await mod.GET()).json()).checks.env.sentry).toBe(true);

    // Only client-side var (the actual prod requirement for browser)
    delete process.env.SENTRY_DSN;
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://x@sentry.io/y';
    mod = await freshImport();
    expect((await (await mod.GET()).json()).checks.env.sentry).toBe(true);
  });
});

describe('GET /api/health — Supabase probe memoization', () => {
  beforeEach(() => {
    clearEnv();
    h.supabaseFromMock.mockReset();
  });

  it('caches the probe result for 30s — second call within window does NOT hit Supabase', async () => {
    setAllCoreEnv();
    mockSupabaseProbeResult({});
    const mod = await freshImport();
    await mod.GET();
    const firstCallCount = h.supabaseFromMock.mock.calls.length;
    expect(firstCallCount).toBe(1);

    // Second call within 30s. Without memoization a busy monitor
    // (Sentry Cron / Vercel uptime, ~1/sec polls) would hammer
    // PostgREST and tank latency.
    await mod.GET();
    expect(h.supabaseFromMock.mock.calls.length).toBe(firstCallCount);

    // Third call — still within window.
    await mod.GET();
    expect(h.supabaseFromMock.mock.calls.length).toBe(firstCallCount);
  });

  it('still reports latencyMs on cached responses', async () => {
    setAllCoreEnv();
    mockSupabaseProbeResult({});
    const mod = await freshImport();
    const first = await (await mod.GET()).json();
    const second = await (await mod.GET()).json();
    // The two probes return the SAME object (memoized), so
    // latencyMs is whatever the first probe measured.
    expect(typeof first.checks.supabase.latencyMs).toBe('number');
    expect(second.checks.supabase.latencyMs).toBe(first.checks.supabase.latencyMs);
  });
});
