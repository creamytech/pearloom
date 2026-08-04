// ─────────────────────────────────────────────────────────────
// day-of/offline-warm — the barn problem.
//
// A coordinator opening "who to call" and getting a spinner at 4pm
// on a Saturday is the most expensive failure in the product: no
// second chance, no support desk. The warm exists so the data is
// already cached before signal dies.
//
// What these tests defend: it only ever READS, it never throws at
// the caller, one failure doesn't take the others down, and it
// skips cleanly when warming would be pointless.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { warmDayOfCache, dayOfWarmUrls } from './offline-warm';

describe('dayOfWarmUrls — the day cannot run without these', () => {
  it('covers who-to-call, the roster, seating, music and toasts', () => {
    const urls = dayOfWarmUrls('site-1').join(' ');
    expect(urls).toContain('/api/vendors/book');
    expect(urls).toContain('/api/guests');
    expect(urls).toContain('/api/seating');
    expect(urls).toContain('/api/song-requests');
    expect(urls).toContain('/api/toasts');
  });

  it('leads with the vendor book — a missing number is the worst case', () => {
    expect(dayOfWarmUrls('site-1')[0]).toContain('/api/vendors/book');
  });

  it('encodes the site id', () => {
    expect(dayOfWarmUrls('a b&c')[0]).toContain('siteId=a%20b%26c');
  });

  it('stays a small, bounded list — a warm, not a prefetch-everything', () => {
    expect(dayOfWarmUrls('s').length).toBeLessThanOrEqual(8);
  });
});

describe('warmDayOfCache', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: { controller: {} } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('warms every endpoint with GETs only — never mutates', async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const fake = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      return new Response('{}', { status: 200 });
    });
    const res = await warmDayOfCache('site-1', { fetchImpl: fake as unknown as typeof fetch });

    expect(res.skipped).toBe(false);
    expect(res.attempted).toBe(dayOfWarmUrls('site-1').length);
    expect(res.warmed).toBe(res.attempted);
    // Every call is a read: no method override anywhere.
    for (const [, init] of calls) {
      expect(init?.method ?? 'GET').toBe('GET');
      expect(init?.body).toBeUndefined();
    }
  });

  it('one failing endpoint never takes down the rest', async () => {
    let n = 0;
    const flaky = vi.fn(async () => {
      n += 1;
      if (n === 2) throw new Error('network');
      return new Response('{}', { status: 200 });
    });
    const res = await warmDayOfCache('site-1', { fetchImpl: flaky as unknown as typeof fetch });
    expect(res.warmed).toBe(res.attempted - 1);
  });

  it('counts a 4xx as warmed — a real answer beats a spinner offline', async () => {
    const denied = vi.fn(async () => new Response('{"error":"nope"}', { status: 403 }));
    const res = await warmDayOfCache('site-1', { fetchImpl: denied as unknown as typeof fetch });
    expect(res.warmed).toBe(res.attempted);
  });

  it('never throws at the caller, even if every call fails', async () => {
    const dead = vi.fn(async () => { throw new Error('down'); });
    await expect(
      warmDayOfCache('site-1', { fetchImpl: dead as unknown as typeof fetch }),
    ).resolves.toEqual({ attempted: 5, warmed: 0, skipped: false });
  });

  it('skips when offline — there is nothing to warm from', async () => {
    vi.stubGlobal('navigator', { onLine: false, serviceWorker: { controller: {} } });
    const fake = vi.fn();
    const res = await warmDayOfCache('site-1', { fetchImpl: fake as unknown as typeof fetch });
    expect(res.skipped).toBe(true);
    expect(fake).not.toHaveBeenCalled();
  });

  it('skips on an empty site id rather than fetching nonsense', async () => {
    const fake = vi.fn();
    expect((await warmDayOfCache('', { fetchImpl: fake as unknown as typeof fetch })).skipped).toBe(true);
    expect((await warmDayOfCache('   ', { fetchImpl: fake as unknown as typeof fetch })).skipped).toBe(true);
    expect(fake).not.toHaveBeenCalled();
  });

  it('skips when no service worker controls the page — nothing would cache', async () => {
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: { controller: null } });
    // No fetchImpl → the real guard applies.
    expect((await warmDayOfCache('site-1')).skipped).toBe(true);
  });
});
