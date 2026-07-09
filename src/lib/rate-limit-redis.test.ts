// ─────────────────────────────────────────────────────────────
// Pearloom / lib/rate-limit-redis.test.ts
//
// Covers the two branches of checkRateLimitAsync:
//   1. No Upstash env vars → falls through to in-memory limiter
//      (same behavior as the existing sync checkRateLimit).
//   2. Upstash env vars set → hits the REST API. We mock global
//      fetch and assert INCR is the command being sent.
// ─────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('checkRateLimitAsync — fallback path (no env vars)', () => {
  let originalUrl: string | undefined;
  let originalToken: string | undefined;

  beforeEach(() => {
    originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });

  it('reports Redis as disabled when env vars are absent', async () => {
    const mod = await import('./rate-limit-redis');
    expect(mod.isRedisRateLimitEnabled()).toBe(false);
  });

  it('allows requests within the limit using the in-memory fallback', async () => {
    const mod = await import('./rate-limit-redis');
    const key = `fallback-allow-${Date.now()}`;
    const result = await mod.checkRateLimitAsync(key, { max: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks once the in-memory window is exhausted', async () => {
    const mod = await import('./rate-limit-redis');
    const key = `fallback-block-${Date.now()}`;
    const config = { max: 2, windowMs: 60_000 };

    expect((await mod.checkRateLimitAsync(key, config)).allowed).toBe(true);
    expect((await mod.checkRateLimitAsync(key, config)).allowed).toBe(true);
    const blocked = await mod.checkRateLimitAsync(key, config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('does NOT call fetch when env vars are absent', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ result: 1 }), { status: 200 }),
    );

    const mod = await import('./rate-limit-redis');
    await mod.checkRateLimitAsync(`no-fetch-${Date.now()}`, { max: 5, windowMs: 60_000 });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('checkRateLimitAsync — Redis path (env vars set)', () => {
  let originalUrl: string | undefined;
  let originalToken: string | undefined;

  beforeEach(() => {
    originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-upstash.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token-xxx';
    vi.resetModules();
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it('reports Redis as enabled when both env vars are set', async () => {
    const mod = await import('./rate-limit-redis');
    expect(mod.isRedisRateLimitEnabled()).toBe(true);
  });

  it('calls Upstash REST API with INCR when checking a rate limit', async () => {
    // Upstash REST API: single-command requests respond
    // { result: <value> }; pipelined / batched requests respond
    // with an array [{ result: <value> }, ...]. The SDK uses an
    // auto-pipeline under the hood so we return the array shape
    // by default and let the single-command paths see { result }.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      // Auto-pipeline endpoint accepts a JSON array of commands;
      // returns a JSON array of { result } objects, one per command.
      if (url.includes('/pipeline')) {
        let commands: unknown[] = [];
        try {
          commands = JSON.parse((init?.body as string) ?? '[]');
        } catch {
          commands = [];
        }
        const response = commands.map(() => ({ result: 1 }));
        return new Response(JSON.stringify(response), { status: 200 });
      }
      // Single command (e.g. `<host>/incr/<key>`).
      return new Response(JSON.stringify({ result: 1 }), { status: 200 });
    });

    const mod = await import('./rate-limit-redis');
    const result = await mod.checkRateLimitAsync('redis-test-key', {
      max: 5,
      windowMs: 60_000,
    });

    expect(fetchSpy).toHaveBeenCalled();

    // Inspect every fetch call and confirm at least one of them
    // is an INCR against our test Upstash host. Upstash's SDK can
    // route either as `<host>/incr/<key>` or as a JSON-body
    // command — we accept either shape.
    const calls = fetchSpy.mock.calls;
    const incrSeen = calls.some(([input, init]) => {
      const url = typeof input === 'string' ? input : (input as Request).url ?? '';
      if (url.includes('/incr/')) return true;
      const body = init?.body;
      if (typeof body === 'string') {
        try {
          const parsed = JSON.parse(body);
          // Upstash command-format body shape: ["INCR", "<key>"] or
          // { command: ["INCR", "<key>"] } depending on SDK version.
          if (Array.isArray(parsed)) {
            return parsed.some(
              (cmd) =>
                Array.isArray(cmd) &&
                typeof cmd[0] === 'string' &&
                cmd[0].toUpperCase() === 'INCR',
            ) || (typeof parsed[0] === 'string' && parsed[0].toUpperCase() === 'INCR');
          }
        } catch {
          // not JSON — ignore
        }
      }
      return false;
    });
    expect(incrSeen).toBe(true);

    // And the result should respect the contract.
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // max 5, count 1 → 4 remaining
  });

  it('blocks once the Redis counter exceeds the limit', async () => {
    // INCR returns 6 → over the limit of 5. Pipeline-shape
    // response: an array with one { result } per command.
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/pipeline')) {
        let commands: unknown[] = [];
        try {
          commands = JSON.parse((init?.body as string) ?? '[]');
        } catch {
          commands = [];
        }
        return new Response(
          JSON.stringify(commands.map(() => ({ result: 6 }))),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ result: 6 }), { status: 200 });
    });

    const mod = await import('./rate-limit-redis');
    const result = await mod.checkRateLimitAsync('redis-over-limit', {
      max: 5,
      windowMs: 60_000,
    });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('falls open to in-memory when Redis errors out', async () => {
    // Simulate an Upstash outage — every fetch throws.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('upstash down'));
    // Suppress the expected console.warn from the fallback path.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mod = await import('./rate-limit-redis');
    const result = await mod.checkRateLimitAsync(`fail-open-${Date.now()}`, {
      max: 5,
      windowMs: 60_000,
    });
    // In-memory limiter on a fresh key allows the request.
    expect(result.allowed).toBe(true);
    warnSpy.mockRestore();
  });
});
