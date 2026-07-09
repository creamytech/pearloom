// ─────────────────────────────────────────────────────────────
// /api/look/from-story route tests
//
// Pins the contract: auth, rate-limit, body validation, Claude
// success path, and the four heuristic-fallback paths (no API
// key, malformed Claude response, Claude throws, missing field).
// The deterministic matcher itself has 14 tests in
// src/lib/look-engine/generate-from-story.test.ts — these tests
// focus on the route's own behaviour.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  sessionMock: { value: { user: { email: 'host@example.test' } } as unknown },
  generateMock: vi.fn() as ReturnType<typeof vi.fn>,
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => h.sessionMock.value),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/claude/client', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    generate: h.generateMock,
  };
});

beforeEach(() => {
  h.sessionMock.value = { user: { email: 'host@example.test' } };
  h.generateMock.mockReset();
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
});

async function importRoute() {
  /* Fresh import so the rate-limit module's per-test request log
     doesn't bleed between tests. */
  vi.resetModules();
  return import('./route');
}

function postReq(body: unknown, ip = '127.0.0.1'): Request {
  return new Request('http://localhost/api/look/from-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/* Helper: build a well-formed Claude response shaped as the SDK
   would return it. */
function claudeJson(payload: unknown) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-4-5-20251001',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 50 },
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  };
}

describe('POST /api/look/from-story', () => {
  it('returns 401 when no session', async () => {
    h.sessionMock.value = null;
    const { POST } = await importRoute();
    const res = await POST(postReq({ text: 'Wedding in Santorini' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is not JSON', async () => {
    const { POST } = await importRoute();
    const res = await POST(postReq('not json'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when text is missing', async () => {
    const { POST } = await importRoute();
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when text is too long (>1000)', async () => {
    const { POST } = await importRoute();
    const res = await POST(postReq({ text: 'x'.repeat(1001) }));
    expect(res.status).toBe(400);
  });

  it('returns heuristic with source=heuristic when ANTHROPIC_API_KEY missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { POST } = await importRoute();
    const res = await POST(postReq({ text: 'Wedding in Santorini, olive groves' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('heuristic');
    expect(body.edition).toBe('linen-folder');
    expect(body.texture).toBe('linen');
    expect(h.generateMock).not.toHaveBeenCalled();
  });

  it('returns Claude result with source=claude when key present + JSON valid', async () => {
    h.generateMock.mockResolvedValue(
      claudeJson({
        occasion: 'wedding',
        edition: 'cinema',
        texture: 'letterpress',
        voiceOverride: 'poetic',
        density: 'spacious',
        textureIntensity: 1.2,
        rationale: 'Black-tie evening reads as Cinema + Letterpress.',
      }),
    );
    const { POST } = await importRoute();
    const res = await POST(postReq({ text: 'Black-tie evening gala with candlelight' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('claude');
    expect(body.edition).toBe('cinema');
    expect(body.texture).toBe('letterpress');
    expect(body.textureIntensity).toBe(1.2);
    expect(body.rationale).toMatch(/Cinema/);
  });

  it('falls back to heuristic when Claude returns malformed JSON', async () => {
    h.generateMock.mockResolvedValue(
      claudeJson({
        /* missing edition + texture */
        occasion: 'wedding',
      }),
    );
    const { POST } = await importRoute();
    const res = await POST(postReq({ text: 'Wedding in Santorini' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('heuristic');
    expect(body.edition).toBe('linen-folder');
  });

  it('falls back to heuristic when Claude throws (network error)', async () => {
    h.generateMock.mockRejectedValue(new Error('Network down'));
    const { POST } = await importRoute();
    const res = await POST(postReq({ text: 'Wedding in Santorini' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('heuristic');
    expect(body.edition).toBe('linen-folder');
  });

  it('clamps textureIntensity above 1.5 to 1.5', async () => {
    h.generateMock.mockResolvedValue(
      claudeJson({
        occasion: 'wedding',
        edition: 'cinema',
        texture: 'letterpress',
        voiceOverride: 'poetic',
        density: 'spacious',
        textureIntensity: 3.7, // Claude went wild
        rationale: 'why',
      }),
    );
    const { POST } = await importRoute();
    const res = await POST(postReq({ text: 'rich' }));
    const body = await res.json();
    expect(body.textureIntensity).toBe(1.5);
  });

  it('clamps textureIntensity below 0 to 0', async () => {
    h.generateMock.mockResolvedValue(
      claudeJson({
        occasion: 'wedding',
        edition: 'cinema',
        texture: 'letterpress',
        voiceOverride: 'poetic',
        density: 'spacious',
        textureIntensity: -0.5,
        rationale: 'why',
      }),
    );
    const { POST } = await importRoute();
    const res = await POST(postReq({ text: 'subtle' }));
    const body = await res.json();
    expect(body.textureIntensity).toBe(0);
  });

  it('rate-limits after 10 calls from the same user+IP', async () => {
    h.generateMock.mockResolvedValue(
      claudeJson({
        occasion: 'wedding',
        edition: 'almanac',
        texture: 'linen',
        voiceOverride: 'classic',
        density: 'comfortable',
        textureIntensity: 1.0,
        rationale: 'why',
      }),
    );
    const { POST } = await importRoute();
    /* 10 allowed */
    for (let i = 0; i < 10; i += 1) {
      const r = await POST(postReq({ text: 'wedding' }, '10.0.0.1'));
      expect(r.status).toBe(200);
    }
    /* 11th rejected */
    const blocked = await POST(postReq({ text: 'wedding' }, '10.0.0.1'));
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toMatch(/Too many/);
  });

  it('uses heuristic rationale as fallback if Claude omits one', async () => {
    h.generateMock.mockResolvedValue(
      claudeJson({
        occasion: 'wedding',
        edition: 'cinema',
        texture: 'letterpress',
        voiceOverride: 'poetic',
        density: 'spacious',
        textureIntensity: 1.0,
        /* rationale omitted */
      }),
    );
    const { POST } = await importRoute();
    const res = await POST(postReq({ text: 'Black-tie evening gala' }));
    const body = await res.json();
    expect(body.rationale).toBeTruthy();
    expect(typeof body.rationale).toBe('string');
  });
});
