// ─────────────────────────────────────────────────────────────
// Pearloom / api/rewrite-text/route.test.ts
//
// Companion to inline-rewrite/route.test.ts. /api/rewrite-text
// is the larger Gemini-based rewriter used by HeroPanel, the
// wizard, PearCommand, and the Studio. It accepts TWO request
// shapes:
//
//   (a) Legacy:      { text, context, style }       — editor rewrite buttons
//   (b) Instruction: { instruction, tone? }         — wizard + Pear
//
// Plus an optional `voiceProfile` that injects voice DNA into
// the prompt. This is the "voice param threading" regression
// guard the audit named.
//
// Response shape returns 4 aliases (text, rewrite, rewritten,
// result) so every caller can read whichever field it prefers
// — also pinned here so a future refactor doesn't break a
// client that reads any one of them.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  sessionMock: { value: { user: { email: 'host@example.test' } } as unknown },
  checkPearGateMock: vi.fn() as ReturnType<typeof vi.fn>,
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

const originalFetch = globalThis.fetch;

beforeEach(() => {
  h.sessionMock.value = { user: { email: 'host@example.test' } };
  h.checkPearGateMock.mockReset();
  h.checkPearGateMock.mockImplementation(async () => ({
    blocked: undefined,
    gate: { isUnlimited: true, plan: 'pro' },
  }));
  process.env.GEMINI_API_KEY = 'test-gemini-key';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

import { POST } from './route';
import { NextRequest } from 'next/server';

// Per-test unique email so the per-email rate limiter doesn't
// bleed between cases. Rate-limit test uses a fixed email.
let emailCounter = 0;
function nextEmail(): string {
  emailCounter += 1;
  return `host-${emailCounter}@example.test`;
}

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/rewrite-text', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

// Capture the Gemini fetch so tests can assert on the prompt
// text + return a canned response per case.
function mockGemini(reply: string, status = 200): { lastPrompt: () => string } {
  let lastPrompt = '';
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as {
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    lastPrompt = body.contents[0]?.parts[0]?.text ?? '';
    const response = {
      candidates: [{ content: { parts: [{ text: reply }] } }],
    };
    return new Response(JSON.stringify(response), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof globalThis.fetch;
  return { lastPrompt: () => lastPrompt };
}

describe('POST /api/rewrite-text — gates', () => {
  beforeEach(() => {
    h.sessionMock.value = { user: { email: nextEmail() } };
  });

  it('401 when no session', async () => {
    h.sessionMock.value = null;
    const res = await POST(postReq({ instruction: 'Write a tagline' }));
    expect(res.status).toBe(401);
  });

  it('returns the gate-blocked response when plan cap exhausted', async () => {
    h.checkPearGateMock.mockImplementationOnce(async () => ({
      blocked: Response.json(
        { error: 'limit_reached', remaining: 0, plan: 'free' },
        { status: 429 },
      ),
      gate: undefined,
    }));
    const res = await POST(postReq({ instruction: 'Write a tagline' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe('limit_reached');
  });

  it('500 when GEMINI_API_KEY not configured', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_KEY;
    delete process.env.GOOGLE_API_KEY;
    const res = await POST(postReq({ instruction: 'x' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/GEMINI_API_KEY/);
  });
});

describe('POST /api/rewrite-text — legacy path (text + context + style)', () => {
  beforeEach(() => {
    h.sessionMock.value = { user: { email: nextEmail() } };
  });

  it('400 when text is missing', async () => {
    const res = await POST(postReq({ context: 'wedding', style: 'poetic' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/text or instruction is required/i);
  });

  it('400 when text exceeds 1000 chars', async () => {
    const res = await POST(postReq({
      text: 'x'.repeat(1001),
      context: 'wedding',
      style: 'poetic',
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/1000/);
  });

  it('400 when context is missing', async () => {
    const res = await POST(postReq({ text: 'come to our wedding', style: 'poetic' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/context is required/i);
  });

  it('400 when style is not one of the three valid options', async () => {
    const res = await POST(postReq({
      text: 'come to our wedding',
      context: 'wedding',
      style: 'shouty',
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/style must be one of/i);
    expect(json.error).toMatch(/poetic/);
    expect(json.error).toMatch(/casual/);
    expect(json.error).toMatch(/shorter/);
  });

  it('happy path threads the style-specific instruction into the prompt', async () => {
    const capture = mockGemini('A softer tagline.');
    await POST(postReq({
      text: 'come to our wedding',
      context: 'beachy palette',
      style: 'poetic',
    }));
    const prompt = capture.lastPrompt();
    // Poetic style instruction must reach the model — regression
    // here would silently apply the wrong style.
    expect(prompt).toMatch(/poetic/i);
    expect(prompt).toMatch(/lyrical|evocative/i);
    expect(prompt).toContain('beachy palette');
    expect(prompt).toContain('come to our wedding');
  });

  it('all four style branches produce different prompts (casual / poetic / shorter)', async () => {
    const seen = new Set<string>();
    for (const style of ['poetic', 'casual', 'shorter'] as const) {
      const capture = mockGemini('ok');
      await POST(postReq({
        text: 'come to our wedding',
        context: 'wedding',
        style,
      }));
      seen.add(capture.lastPrompt());
    }
    // Three styles → three distinct prompts. If two collapse into
    // the same prompt, the STYLE_INSTRUCTIONS table got mangled.
    expect(seen.size).toBe(3);
  });
});

describe('POST /api/rewrite-text — instruction path (Pear v8)', () => {
  beforeEach(() => {
    h.sessionMock.value = { user: { email: nextEmail() } };
  });

  it('400 when instruction exceeds 4000 chars', async () => {
    const res = await POST(postReq({ instruction: 'x'.repeat(4001) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/4000/);
  });

  it('happy path: threads the instruction + warm-default tone into the prompt', async () => {
    const capture = mockGemini('A line you would actually say.');
    await POST(postReq({ instruction: 'Write a one-line hero tagline.' }));
    const prompt = capture.lastPrompt();
    expect(prompt).toContain('Write a one-line hero tagline.');
    // No explicit tone → default "warm, specific, human".
    expect(prompt).toMatch(/warm, specific, human/);
    // Anti-cliché rule — regression here would let "magical day"
    // and "tying the knot" leak into AI copy.
    expect(prompt).toMatch(/tying the knot/);
    expect(prompt).toMatch(/magical day/);
  });

  it('tone parameter overrides the warm default in the prompt', async () => {
    const capture = mockGemini('ok');
    await POST(postReq({
      instruction: 'Write a hero tagline.',
      tone: 'solemn — this is a memorial',
    }));
    expect(capture.lastPrompt()).toContain('Tone: solemn — this is a memorial.');
  });
});

describe('POST /api/rewrite-text — voiceProfile threading (audit regression guard)', () => {
  beforeEach(() => {
    h.sessionMock.value = { user: { email: nextEmail() } };
  });

  it('no voiceProfile → no voice block in the prompt', async () => {
    const capture = mockGemini('ok');
    await POST(postReq({ instruction: 'Write a tagline.' }));
    expect(capture.lastPrompt()).not.toMatch(/Voice profile/i);
  });

  it('voiceProfile.tone is injected into the prompt', async () => {
    const capture = mockGemini('ok');
    await POST(postReq({
      instruction: 'Write a tagline.',
      voiceProfile: { tone: 'dry-witty' },
    }));
    const prompt = capture.lastPrompt();
    expect(prompt).toMatch(/Voice profile/i);
    expect(prompt).toMatch(/Tone: dry-witty/);
  });

  it('voiceProfile.formality is rendered when numeric', async () => {
    const capture = mockGemini('ok');
    await POST(postReq({
      instruction: 'Write a tagline.',
      voiceProfile: { tone: 'warm', formality: 4 },
    }));
    expect(capture.lastPrompt()).toMatch(/Formality.*: 4/);
  });

  it('signature phrases (first 6) injected as quoted list', async () => {
    const capture = mockGemini('ok');
    await POST(postReq({
      instruction: 'Write a tagline.',
      voiceProfile: {
        tone: 'warm',
        phrases: ['truly truly', 'extra fancy', 'ish', 'a bit', 'so good', 'wild', 'EXTRA'],
      },
    }));
    const prompt = capture.lastPrompt();
    expect(prompt).toMatch(/"truly truly"/);
    expect(prompt).toMatch(/"so good"/);
    expect(prompt).toMatch(/"wild"/);
    // Only the FIRST 6 — the 7th ("EXTRA") MUST NOT appear.
    expect(prompt).not.toMatch(/"EXTRA"/);
  });

  it('avoidList (first 5) injected as quoted list', async () => {
    const capture = mockGemini('ok');
    await POST(postReq({
      instruction: 'Write a tagline.',
      voiceProfile: {
        tone: 'warm',
        avoidList: ['amazing', 'literally', 'super', 'love', 'cool', 'EXTRA-AVOID'],
      },
    }));
    const prompt = capture.lastPrompt();
    expect(prompt).toMatch(/"amazing"/);
    expect(prompt).toMatch(/"cool"/);
    expect(prompt).not.toMatch(/"EXTRA-AVOID"/);
  });

  it('voiceProfile flows through the legacy path too (text + context + style)', async () => {
    const capture = mockGemini('ok');
    await POST(postReq({
      text: 'come to our wedding',
      context: 'wedding',
      style: 'poetic',
      voiceProfile: { tone: 'gentle' },
    }));
    expect(capture.lastPrompt()).toMatch(/Voice profile/i);
    expect(capture.lastPrompt()).toMatch(/Tone: gentle/);
  });
});

describe('POST /api/rewrite-text — response shape + cleaning', () => {
  beforeEach(() => {
    h.sessionMock.value = { user: { email: nextEmail() } };
  });

  it('returns all four aliases (text, rewrite, rewritten, result) with the same value', async () => {
    mockGemini('A clean rewrite.');
    const res = await POST(postReq({ instruction: 'Write a tagline.' }));
    const json = await res.json();
    expect(json).toMatchObject({
      text: 'A clean rewrite.',
      rewrite: 'A clean rewrite.',
      rewritten: 'A clean rewrite.',
      result: 'A clean rewrite.',
    });
  });

  it('strips markdown code fences from Gemini output', async () => {
    mockGemini('```\nA fenced rewrite.\n```');
    const res = await POST(postReq({ instruction: 'x' }));
    const json = await res.json();
    expect(json.text).toBe('A fenced rewrite.');
  });

  it('strips wrapping quotes (straight + curly)', async () => {
    mockGemini('“A quoted rewrite.”');
    const res = await POST(postReq({ instruction: 'x' }));
    const json = await res.json();
    expect(json.text).toBe('A quoted rewrite.');
  });

  it('500 when Gemini returns empty', async () => {
    mockGemini('');
    const res = await POST(postReq({ instruction: 'x' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed/i);
  });

  it('500 with safe copy when Gemini throws (non-2xx propagates through callGemini)', async () => {
    mockGemini('upstream broke', 503);
    const res = await POST(postReq({ instruction: 'x' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    // Generic copy — we don't leak Gemini's internal status to clients.
    expect(json.error).toMatch(/Rewrite failed/i);
  });
});
