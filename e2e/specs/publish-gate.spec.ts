/*
 * publish-gate.spec.ts — "Nothing is public until you publish," true.
 *
 * NEW-USER-REVAMP H7: pressed-but-unpublished drafts served their
 * complete site (names, date, schedule, parking) at a guessable URL,
 * and their calendar file leaked the same. The gate now lives in the
 * public route (page + metadata + sub-pages + event.ics): anonymous
 * visitors get a 404 indistinguishable from a never-pressed slug;
 * the owner keeps a seamless draft preview.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

async function deleteSite(request: APIRequestContext, subdomain: string) {
  await request.delete(`/api/sites/${encodeURIComponent(subdomain)}`).catch(() => {});
}

test.describe('the publish gate', () => {
  test('a draft is invisible to guests, visible to its owner, and live after publish', async ({ request, browser }) => {
    test.setTimeout(180_000);
    const stamp = Date.now().toString(36);
    const slug = `fence-gate-${stamp}`;

    // Press a draft through the API (create, no publish).
    const created = await request.post('/api/sites', {
      data: {
        create: true,
        pressKey: `gate-key-${stamp}-abcdef12`,
        subdomain: slug,
        names: ['Gate', 'Fence'] as [string, string],
        manifest: {
          occasion: 'wedding',
          names: ['Gate', 'Fence'],
          logistics: { date: '2027-09-04', venue: 'Fence Hall' },
          theme: { colors: { accent: '#7a8b5c' } },
        },
      },
    });
    expect(created.ok()).toBeTruthy();
    const finalSlug = (await created.json()).subdomain as string;

    try {
      // 1 · Anonymous guest — the draft must not exist for them.
      // (The page streams through loading.tsx, so the HTTP status is
      // committed as 200 before the not-found boundary renders — the
      // substance of the gate is asserted instead: the 404 surface,
      // zero site content, and a clean title. event.ics, a route
      // handler, carries the true 404 status.)
      const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const anonPage = await anon.newPage();
      await anonPage.goto(`/sites/${finalSlug}`, { waitUntil: 'domcontentloaded' });
      await expect
        .poll(async () => anonPage.evaluate(() => document.body.innerText.toLowerCase()), { timeout: 20_000 })
        .toContain('site not found');
      const body = await anonPage.evaluate(() => document.body.innerText);
      expect(body).not.toContain('Fence Hall');
      expect(body).not.toContain('SAVE THE DATE');
      // The title must not leak the names either.
      expect(await anonPage.title()).not.toContain('Gate');

      // The calendar file is gated the same way.
      const ics = await anonPage.request.get(`/sites/${finalSlug}/event.ics`);
      expect(ics.status()).toBe(404);
      await anon.close();

      // 2 · The owner — seamless draft preview, same URL.
      const owner = await request.get(`/sites/${finalSlug}`);
      expect(owner.status()).toBe(200);
      expect(await owner.text()).toContain('Fence Hall');

      // 3 · Publish, then the guest door opens.
      const published = await request.post('/api/sites/publish', {
        data: {
          subdomain: finalSlug,
          names: ['Gate', 'Fence'],
          manifest: {
            occasion: 'wedding',
            names: ['Gate', 'Fence'],
            published: true,
            publishedAt: new Date().toISOString(),
            logistics: { date: '2027-09-04', venue: 'Fence Hall' },
            theme: { colors: { accent: '#7a8b5c' } },
          },
        },
      });
      expect(published.ok()).toBeTruthy();

      const anon2 = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const anonPage2 = await anon2.newPage();
      const liveResp = await anonPage2.goto(`/sites/${finalSlug}`, { waitUntil: 'domcontentloaded' });
      expect(liveResp?.status()).toBe(200);
      await expect
        .poll(async () => anonPage2.evaluate(() => document.body.innerText), { timeout: 20_000 })
        .toContain('Fence Hall');
      await anon2.close();
    } finally {
      await deleteSite(request, finalSlug);
    }
  });
});
