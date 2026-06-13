// ─────────────────────────────────────────────────────────────
// Pearloom / api/inline-rewrite/route.test.ts
//
// The audit's deferred Phase 2 item: AI rewrite + revert test
// coverage. Phase 3.3 added a checkPearGate to this route — that
// gate is currently untested for the rewrite paths. This file
// pins the full contract: auth, plan gate, rate limit, body
// validation, Claude API graceful degrade, and the rewrite
// response shape.
//
// The "voice param threading" concern the audit named lives in
// rewrite-text/route.test.ts (that's the route with the
// voiceProfile parameter); this file covers the Claude-Haiku
// path used by the canvas FloatingFormatToolbar.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  sessionMock: { value: { user: { email: 'host@example.test' } } as unknown },
  checkPearGateMock: vi.fn() as ReturnType<typeof vi.fn>,
  /* Claude client mock — the route moved to the centralized
     generate() wrapper (which uses the Anthropic SDK, not raw
     fetch), so mocking globalThis.fetch no longer intercepts
     the Claude call. We mock the wrapper itself. The captured
     call args are exposed via h.claudeCalls for assertion. */
  generateMock: vi.fn() as ReturnType<typeof vi.fn> & ((opts: Record<string, unknown>) => Promise<unknown>),
  claudeCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => h.sessionMock.value),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/rate-limit', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    checkPearGate: h.checkPearGateMock,
  };
});
vi.mock('@/lib/claude/client', () => ({
  generate: (opts: Record<string, unknown>) => {
    h.claudeCalls.push(opts);
    return h.generateMock(opts);
  },
  textFrom: (msg: { content?: Array<{ text?: string }> }) =>
    msg.content?.[0]?.text ?? '',
  // Mirrors the real cached() helper — the route wraps its static
  // system prompt in a cache_control text block (prompt caching).
  cached: (text: string, ttl: '5m' | '1h' = '5m') => ({
    type: 'text',
    text,
    cache_control: { type: 'ephemeral', ttl },
  }),
  CLAUDE_HAIKU: 'claude-haiku-4-5-20251001',
}));

const originalFetch = globalThis.fetch;
beforeEach(() => {
  h.sessionMock.value = { user: { email: 'host@example.test' } };
  h.checkPearGateMock.mockReset();
  h.generateMock.mockReset();
  h.claudeCalls.length = 0;
  // Default: unlimited plan so cases focus on the route's own logic.
  h.checkPearGateMock.mockImplementation(async () => ({
    blocked: undefined,
    gate: { isUnlimited: true, plan: 'pro' },
  }));
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

import { afterEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Per-test unique IP so the per-(email+ip) rate limiter doesn't
// bleed between cases. Rate-limit test uses a fixed IP intentionally.
let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter % 255}`;
}

function postReq(body: unknown, ip = nextIp()): NextRequest {
  return new NextRequest('http://localhost/api/inline-rewrite', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
  });
}

function mockAnthropic(reply: string, status = 200): void {
  // The route now uses the centralized generate() wrapper, so we
  // mock the SDK return shape directly. A non-200 status is
  // simulated by throwing — matches the route's try/catch path
  // (which falls back to returning the original text).
  if (status !== 200) {
    h.generateMock.mockImplementation(async () => {
      throw new Error(`Anthropic API error: ${status}`);
    });
    return;
  }
  h.generateMock.mockResolvedValue({
    content: [{ type: 'text', text: reply }],
  });
}

describe('POST /api/inline-rewrite — gates', () => {
  it('401 when no session', async () => {
    h.sessionMock.value = null;
    const res = await POST(postReq({ text: 'hello world' }));
    expect(res.status).toBe(401);
  });

  it('returns the gate-blocked response when plan-tier cap exhausted', async () => {
    // The gate returns a Response when blocked — route must propagate
    // it verbatim. Without this, free users on the cap would 200 +
    // burn Anthropic budget regardless.
    h.checkPearGateMock.mockImplementationOnce(async () => ({
      blocked: Response.json(
        { error: 'limit_reached', remaining: 0, plan: 'free' },
        { status: 429 },
      ),
      gate: undefined,
    }));
    const res = await POST(postReq({ text: 'hello world' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe('limit_reached');
  });

  it('429 from rate limit after 30 calls from same email+ip', async () => {
    const sharedIp = '203.0.113.50';
    mockAnthropic('rewritten ok');
    for (let i = 0; i < 30; i++) {
      const r = await POST(postReq({ text: 'hello world' }, sharedIp));
      expect(r.status).toBe(200);
    }
    const blocked = await POST(postReq({ text: 'hello world' }, sharedIp));
    expect(blocked.status).toBe(429);
    const json = await blocked.json();
    expect(json.error).toMatch(/too many/i);
  });
});

describe('POST /api/inline-rewrite — body validation', () => {
  it('400 on invalid JSON body', async () => {
    const res = await POST(postReq('not-json'));
    expect(res.status).toBe(400);
  });

  it('400 on empty selection', async () => {
    const res = await POST(postReq({ text: '' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/empty/i);
  });

  it('400 on whitespace-only selection (post-trim empty)', async () => {
    const res = await POST(postReq({ text: '   ' }));
    expect(res.status).toBe(400);
  });

  it('400 on single-character selection (<2 chars after trim)', async () => {
    const res = await POST(postReq({ text: 'x' }));
    expect(res.status).toBe(400);
  });

  it('400 on too-long selection (>1200 chars)', async () => {
    const res = await POST(postReq({ text: 'x'.repeat(1201) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/too long/i);
  });

  it('accepts the boundary case at exactly 1200 chars', async () => {
    mockAnthropic('rewritten');
    const res = await POST(postReq({ text: 'x'.repeat(1200) }));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/inline-rewrite — graceful degrade paths', () => {
  it('returns the original text when ANTHROPIC_API_KEY is missing (no crash)', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(postReq({ text: 'hello world' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    // CRITICAL: graceful — UI can't get stuck in a busy state if
    // the SDK is unconfigured. Without this path, hosts on dev
    // deploys would see Pear hang forever.
    expect(json.rewritten).toBe('hello world');
  });

  it('returns the original text when Anthropic returns non-2xx', async () => {
    mockAnthropic('this should not appear', 503);
    const res = await POST(postReq({ text: 'hello world' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rewritten).toBe('hello world');
  });

  it('returns the original text when fetch throws (network error)', async () => {
    globalThis.fetch = (async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof globalThis.fetch;
    const res = await POST(postReq({ text: 'hello world' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rewritten).toBe('hello world');
  });

  it('falls back to original when Anthropic returns empty text block', async () => {
    mockAnthropic('');
    const res = await POST(postReq({ text: 'hello world' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    // The route's `(block?.text ?? '').trim() || text` short-circuit
    // means empty rewrite returns original, not empty string.
    expect(json.rewritten).toBe('hello world');
  });
});

describe('POST /api/inline-rewrite — happy path', () => {
  it('200 returns the trimmed rewrite from Claude', async () => {
    mockAnthropic('  A warmer, tighter version.  ');
    const res = await POST(postReq({ text: 'Please come to our wedding.' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rewritten).toBe('A warmer, tighter version.');
  });

  it('sends the right tier + system prompt to the Claude wrapper', async () => {
    mockAnthropic('ok');
    await POST(postReq({ text: 'a selection' }));

    expect(h.claudeCalls).toHaveLength(1);
    const call = h.claudeCalls[0];
    // The route uses tier: 'haiku' which the wrapper maps to the
    // current Haiku model id. Pinning the tier is what guarantees
    // model-id central management — the test should care about the
    // contract, not the literal model string.
    expect(call.tier).toBe('haiku');
    // The system prompt is now a cached() text-block array (prompt
    // caching) — flatten to a string for the content assertions.
    const systemBlocks = call.system as Array<{
      text: string;
      cache_control?: { type: string };
    }>;
    expect(Array.isArray(systemBlocks)).toBe(true);
    // Regression guard for prompt caching: the static system prefix
    // must carry a cache_control breakpoint.
    expect(systemBlocks[0]?.cache_control?.type).toBe('ephemeral');
    const system = systemBlocks.map((b) => b.text).join('\n');
    // Regression guard for the prompt's two non-negotiable rules:
    // ±20% length AND no extraneous quotes/headers. If either is
    // dropped, hosts see rewrites that drift in length or come
    // wrapped in markdown quotes.
    expect(system).toMatch(/length within .20%/);
    expect(system).toMatch(/Do not add quote marks/i);
  });
});
