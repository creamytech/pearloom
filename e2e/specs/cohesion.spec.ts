/*
 * cohesion.spec.ts — Sprint N's fence (COHESION-PLAN N.4).
 *
 * "One surface": inside the product, navigation never reloads the
 * document, and the weave cut (the one house route transition) fires
 * exactly where the laws say:
 *   · cross-zone navigation (dashboard → editor) runs through
 *     document.startViewTransition (window.__plWeaveCuts counts it);
 *   · shell tab switches (/dashboard/* → /dashboard/*) NEVER
 *     transition — the "(shell) is one page" decision is law;
 *   · reduced motion never enters the transition path;
 *   · the document survives the whole walk (a window marker set at
 *     the start is still there at the end — zero full reloads).
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

const SLUG = 'cohesion-fence';

async function deleteSite(request: APIRequestContext, subdomain: string) {
  await request.delete(`/api/sites/${encodeURIComponent(subdomain)}`).catch(() => {});
}

async function mintSite(request: APIRequestContext) {
  await deleteSite(request, SLUG);
  const res = await request.post('/api/sites', {
    data: {
      create: true,
      subdomain: SLUG,
      manifest: { occasion: 'wedding', names: ['Maya', 'Daniel'] },
    },
  });
  const json = (await res.json().catch(() => ({}))) as { subdomain?: string };
  return json.subdomain ?? SLUG;
}

test.describe('one surface — the cohesion laws', () => {
  test('cross-zone navs weave, shell tabs stay still, the document never reloads', async ({ page, request }) => {
    test.setTimeout(180_000);
    const slug = await mintSite(request);

    await page.goto('/dashboard/event', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => {
      (window as unknown as { __pl_alive?: number }).__pl_alive = 1;
    });

    const cuts = () => page.evaluate(
      () => (window as unknown as { __plWeaveCuts?: number }).__plWeaveCuts ?? 0,
    );
    const alive = () => page.evaluate(
      () => (window as unknown as { __pl_alive?: number }).__pl_alive ?? null,
    );

    // ── Shell tab switch: instant, no transition ──
    const before = await cuts();
    // Dispatch through the DOM (the sidebar link may sit inside a
    // collapsed drawer at some widths — the click still routes
    // through the upgrader + Next Link).
    await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(
        (x) => x.getAttribute('href') === '/dashboard/invite',
      ) as HTMLAnchorElement | undefined;
      a?.click();
    });
    await page.waitForURL('**/dashboard/invite', { timeout: 30_000 });
    await page.waitForTimeout(600);
    expect(await cuts(), 'a shell tab switch must not run the weave cut').toBe(before);

    // ── Cross-zone: dashboard → editor gets exactly the cut ──
    // Back to My sites SOFTLY — a goto here would be the test
    // reloading the document itself.
    await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(
        (x) => x.getAttribute('href') === '/dashboard/event',
      ) as HTMLAnchorElement | undefined;
      a?.click();
    });
    await page.waitForURL('**/dashboard/event', { timeout: 30_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    const beforeZone = await cuts();
    await page.waitForFunction(
      () => [...document.querySelectorAll('a')].some((x) => x.getAttribute('href')?.startsWith('/editor/')),
      undefined,
      { timeout: 30_000 },
    );
    await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(
        (x) => x.getAttribute('href')?.startsWith('/editor/'),
      ) as HTMLAnchorElement | undefined;
      a?.click();
    });
    await page.waitForURL('**/editor/**', { timeout: 60_000 });
    await page.waitForTimeout(600);
    expect(await cuts(), 'dashboard → editor crosses a zone and must weave').toBeGreaterThan(beforeZone);

    // ── The whole walk was one document ──
    expect(await alive(), 'the document reloaded somewhere in the walk').toBe(1);

    await deleteSite(request, slug);
  });

  test('reduced motion never enters the transition path', async ({ browser, request }) => {
    test.setTimeout(180_000);
    const slug = await mintSite(request);
    const ctx = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();

    await page.goto('/dashboard/event', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => {
      (window as unknown as { __pl_alive?: number }).__pl_alive = 1;
    });

    await page.waitForFunction(
      () => [...document.querySelectorAll('a')].some((x) => x.getAttribute('href')?.startsWith('/editor/')),
      undefined,
      { timeout: 30_000 },
    );
    await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(
        (x) => x.getAttribute('href')?.startsWith('/editor/'),
      ) as HTMLAnchorElement | undefined;
      a?.click();
    });
    await page.waitForURL('**/editor/**', { timeout: 60_000 });
    await page.waitForTimeout(600);

    const cuts = await page.evaluate(
      () => (window as unknown as { __plWeaveCuts?: number }).__plWeaveCuts ?? 0,
    );
    expect(cuts, 'reduced motion must skip startViewTransition entirely').toBe(0);
    const alive = await page.evaluate(
      () => (window as unknown as { __pl_alive?: number }).__pl_alive ?? null,
    );
    expect(alive, 'reduced motion still navigates softly').toBe(1);

    await ctx.close();
    await deleteSite(request, slug);
  });
});
