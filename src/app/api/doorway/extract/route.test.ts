// ─────────────────────────────────────────────────────────────
// doorway/extract route — the anonymous door.
//
// This endpoint is deliberately reachable without a session (the
// whole point is a preview BEFORE signup), and it fetches a URL
// the caller supplies. That combination is exactly the shape of an
// SSRF hole, so the tests that matter are:
//
//   • Every fetch goes through lib/safe-fetch — the route never
//     calls global fetch itself. (Proven by mocking safe-fetch and
//     asserting global fetch is untouched.)
//   • A URL safe-fetch refuses yields a clean 422, never a leak of
//     WHY (which would confirm an internal host exists).
//   • Nothing is ever written.
//   • The AI pass is skipped when the deterministic parse already
//     answered — most calls must cost nothing.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  state: {
    fetchResult: null as string | null,
    fetchedUrls: [] as string[],
    rateAllowed: true,
    modelCalls: 0,
  },
}));

vi.mock('@/lib/safe-fetch', () => ({
  safeFetchText: vi.fn(async (url: string) => {
    h.state.fetchedUrls.push(url);
    return h.state.fetchResult;
  }),
  vetUrl: vi.fn(async (u: string) => new URL(u)),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: h.state.rateAllowed }),
  getClientIp: () => '203.0.113.7',
}));

vi.mock('@/lib/ai-budget', () => ({
  overBudget: vi.fn(async () => false),
  chargeAi: vi.fn(async () => {}),
  centsForUsage: () => 1,
  approxTokens: () => 100,
  budgetKey: () => 'k',
}));

vi.mock('@/lib/claude/structured', () => ({
  generateJson: vi.fn(async () => {
    h.state.modelCalls += 1;
    return { venueName: 'The Old Mill' };
  }),
}));

import { POST } from './route';
import { NextRequest } from 'next/server';
import { safeFetchText } from '@/lib/safe-fetch';

function req(body: unknown) {
  return new NextRequest('http://localhost/api/doorway/extract', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const GOOD_PAGE = `
  <html><head><title>Emma &amp; James — Our Wedding</title></head>
  <body><h1>Emma &amp; James</h1>
  <p>We're getting married on September 12, 2027 at The Old Mill.</p>
  <p>4:00 PM — Ceremony</p></body></html>`;

beforeEach(() => {
  vi.clearAllMocks();
  h.state.fetchResult = GOOD_PAGE;
  h.state.fetchedUrls = [];
  h.state.rateAllowed = true;
  h.state.modelCalls = 0;
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
});

describe('the anonymous posture', () => {
  it('works with NO session — that is the point of the door', async () => {
    const res = await POST(req({ url: 'https://example.test/wedding' }));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean; prefill: { names?: string[] } };
    expect(json.ok).toBe(true);
    expect(json.prefill.names).toEqual(['Emma', 'James']);
  });

  it('is rate limited', async () => {
    h.state.rateAllowed = false;
    const res = await POST(req({ url: 'https://example.test/x' }));
    expect(res.status).toBe(429);
  });

  it('rejects an empty request', async () => {
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req({ url: '', text: '   ' }))).status).toBe(400);
  });

  it('rejects an absurdly long url without fetching it', async () => {
    const res = await POST(req({ url: `https://example.test/${'a'.repeat(2100)}` }));
    expect(res.status).toBe(400);
    expect(h.state.fetchedUrls).toEqual([]);
  });
});

describe('SSRF posture — every fetch goes through safe-fetch', () => {
  it('never calls global fetch itself', async () => {
    const globalFetch = vi.spyOn(globalThis, 'fetch');
    await POST(req({ url: 'https://example.test/wedding' }));
    expect(globalFetch).not.toHaveBeenCalled();
    expect(safeFetchText).toHaveBeenCalledWith('https://example.test/wedding');
    globalFetch.mockRestore();
  });

  it('returns a clean 422 when safe-fetch refuses, leaking no reason', async () => {
    // safe-fetch returns null for a private host, a redirect to one,
    // a bad scheme, a timeout — all indistinguishable by design.
    h.state.fetchResult = null;
    const res = await POST(req({ url: 'http://169.254.169.254/latest/meta-data' }));
    expect(res.status).toBe(422);
    const json = await res.json() as { error: string };
    expect(json.error).not.toMatch(/private|internal|127|169\.254|dns|redirect/i);
  });

  it('does not fetch at all on the text branch', async () => {
    await POST(req({ text: 'Emma & James, September 12, 2027' }));
    expect(h.state.fetchedUrls).toEqual([]);
  });
});

describe('extraction behaviour', () => {
  it('reads a pasted note without any network', async () => {
    // What a host actually pastes: a save-the-date's own lines.
    const res = await POST(req({
      text: 'Save the Date\nEmma & James\nSeptember 12, 2027\nThe Old Mill',
    }));
    const json = await res.json() as {
      source: string;
      prefill: { names?: string[]; eventDate?: string; occasion?: string };
      empty: boolean;
    };
    expect(json.source).toBe('text');
    expect(json.prefill.names).toEqual(['Emma', 'James']);
    expect(json.prefill.eventDate).toBe('2027-09-12');
    expect(json.prefill.occasion).toBe('wedding');
    expect(json.empty).toBe(false);
  });

  it('reports empty (rather than inventing) when there is nothing to read', async () => {
    const res = await POST(req({ text: 'hello' }));
    const json = await res.json() as { empty: boolean; prefill: Record<string, unknown> };
    expect(json.empty).toBe(true);
  });

  it('spends NOTHING on AI for input too thin to be worth reading', async () => {
    // The doorway must be cheap: a stray keystroke can't cost a
    // model call, and the endpoint is anonymous so this is also an
    // abuse guard.
    await POST(req({ text: 'x' }));
    expect(h.state.modelCalls).toBe(0);
  });

  it('a model suggestion never overwrites a parsed fact', async () => {
    const res = await POST(req({ url: 'https://example.test/wedding' }));
    const json = await res.json() as { prefill: { names?: string[]; eventDate?: string; venueName?: string } };
    // Parsed from the page…
    expect(json.prefill.names).toEqual(['Emma', 'James']);
    expect(json.prefill.eventDate).toBe('2027-09-12');
    // …model filled only the blank.
    expect(json.prefill.venueName).toBe('The Old Mill');
  });

  it('still returns the deterministic result when the model throws', async () => {
    const { generateJson } = await import('@/lib/claude/structured');
    vi.mocked(generateJson).mockRejectedValueOnce(new Error('model down'));
    const res = await POST(req({ text: 'Emma & James\nSeptember 12, 2027' }));
    expect(res.status).toBe(200);
    const json = await res.json() as { prefill: { names?: string[] } };
    expect(json.prefill.names).toEqual(['Emma', 'James']);
  });

  it('skips the model entirely when no API key is configured', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    await POST(req({ text: 'Emma & James\nSeptember 12, 2027\nsomewhere nice' }));
    expect(h.state.modelCalls).toBe(0);
  });
});
