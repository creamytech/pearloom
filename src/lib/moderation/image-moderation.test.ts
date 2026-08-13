import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { moderateImageBuffer, isImageModerationEnabled } from './image-moderation';

const BUF = Buffer.from('not-a-real-image');

function mockModeration(categories: Record<string, boolean>, scores: Record<string, number> = {}) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results: [{ categories, category_scores: scores }] }),
  });
}

describe('moderateImageBuffer', () => {
  const realFetch = global.fetch;
  const realKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test';
  });
  afterEach(() => {
    global.fetch = realFetch;
    if (realKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = realKey;
    vi.restoreAllMocks();
  });

  it('fails open when no API key is configured', async () => {
    delete process.env.OPENAI_API_KEY;
    expect(isImageModerationEnabled()).toBe(false);
    const r = await moderateImageBuffer(BUF, 'image/jpeg');
    expect(r).toEqual({ allowed: true, checked: false });
  });

  it('rejects sexual/minors regardless of score', async () => {
    global.fetch = mockModeration({ 'sexual/minors': true }, { 'sexual/minors': 0.2 }) as never;
    const r = await moderateImageBuffer(BUF, 'image/jpeg');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('sexual/minors');
  });

  it('rejects confident sexual content', async () => {
    global.fetch = mockModeration({ sexual: true }, { sexual: 0.95 }) as never;
    const r = await moderateImageBuffer(BUF, 'image/png');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('sexual');
  });

  it('allows a flagged-but-low-confidence sexual signal', async () => {
    global.fetch = mockModeration({ sexual: true }, { sexual: 0.3 }) as never;
    const r = await moderateImageBuffer(BUF, 'image/jpeg');
    expect(r.allowed).toBe(true);
    expect(r.checked).toBe(true);
  });

  it('allows clean images', async () => {
    global.fetch = mockModeration({ sexual: false, violence: false }, { sexual: 0.01 }) as never;
    const r = await moderateImageBuffer(BUF, 'image/webp');
    expect(r).toEqual({ allowed: true, checked: true });
  });

  it('fails open on a non-OK API response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }) as never;
    const r = await moderateImageBuffer(BUF, 'image/jpeg');
    expect(r).toEqual({ allowed: true, checked: false });
  });

  it('fails open when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network')) as never;
    const r = await moderateImageBuffer(BUF, 'image/jpeg');
    expect(r.allowed).toBe(true);
    expect(r.checked).toBe(false);
  });
});
