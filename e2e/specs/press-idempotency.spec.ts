/*
 * press-idempotency.spec.ts — one press, one site. Ever.
 *
 * NEW-USER-REVAMP H2: a double-fired seal created two sites 23s
 * apart, squatted the couple's clean URL with their own orphan, and
 * consumed both free-tier slots. The fix is layered — a ref guard in
 * handleFinish, a per-press idempotency key persisted with the draft,
 * and same-key adoption in findAvailableSubdomain — and this spec
 * pins the layer that matters most: the server converging replays
 * onto one row.
 *
 * Runs with the studio suite's authenticated storageState.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

// The e2e account rides the real free tier (2 sites) — every site a
// test presses must be deleted afterward or the NEXT run hits the
// (correctly working) 402 plan gate.
async function deleteSite(request: APIRequestContext, subdomain: string) {
  await request.delete(`/api/sites/${encodeURIComponent(subdomain)}`).catch(() => {});
}

test.describe('the press is idempotent', () => {
  test('a replayed create with the same pressKey converges on the same site', async ({ request }) => {
    const stamp = Date.now().toString(36);
    const base = `fence-press-${stamp}`;
    const pressKey = `fence-key-${stamp}-abcdef12`;
    const body = {
      create: true,
      pressKey,
      subdomain: base,
      names: ['Fence', 'Press'] as [string, string],
      manifest: {
        occasion: 'wedding',
        names: ['Fence', 'Press'],
        theme: { colors: { accent: '#7a8b5c' } },
      },
    };

    const first = await request.post('/api/sites', { data: body });
    expect(first.ok()).toBeTruthy();
    const firstJson = await first.json();
    expect(firstJson.subdomain).toBeTruthy();

    // The replay — same key, same payload (a double-fired seal, a
    // network retry, a resumed press). Must land on the SAME row.
    const second = await request.post('/api/sites', { data: body });
    expect(second.ok()).toBeTruthy();
    const secondJson = await second.json();
    expect(secondJson.subdomain).toBe(firstJson.subdomain);

    // And no `-2` sibling was minted.
    const list = await request.get('/api/sites');
    expect(list.ok()).toBeTruthy();
    const sites = (await list.json())?.sites ?? [];
    const mine = sites.filter((s: { subdomain?: string; domain?: string }) =>
      String(s.subdomain ?? s.domain ?? '').startsWith(base));
    expect(mine.length).toBe(1);

    await deleteSite(request, firstJson.subdomain);
  });

  test('a create WITHOUT a key still never lands on a taken slug', async ({ request }) => {
    // The pre-existing contract stays: distinct presses (distinct
    // keys / no key) that want the same slug get suffixed, not
    // merged — a second site with the same couple names must never
    // silently overwrite the first.
    const stamp = Date.now().toString(36);
    const base = `fence-slug-${stamp}`;
    const mk = (key: string | null) => ({
      create: true,
      ...(key ? { pressKey: key } : {}),
      subdomain: base,
      names: ['Slug', 'Fence'] as [string, string],
      manifest: { occasion: 'wedding', names: ['Slug', 'Fence'], theme: { colors: { accent: '#7a8b5c' } } },
    });

    const a = await request.post('/api/sites', { data: mk(`key-a-${stamp}-11111111`) });
    const b = await request.post('/api/sites', { data: mk(`key-b-${stamp}-22222222`) });
    expect(a.ok() && b.ok()).toBeTruthy();
    const aSub = (await a.json()).subdomain;
    const bSub = (await b.json()).subdomain;
    expect(aSub).not.toBe(bSub);
    expect(bSub.startsWith(base)).toBeTruthy();

    await deleteSite(request, aSub);
    await deleteSite(request, bSub);
  });
});
