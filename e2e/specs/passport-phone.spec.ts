/*
 * passport-phone.spec.ts — the guest passport is phone-first and
 * tells the guest the truth about their own reply (Sprint G.4).
 *
 * The audit found /g/[token] at 390px scrolling horizontally to
 * 540px (playlist inputs + thread composer refusing to shrink), the
 * letter signed "Us" with a "U S" monogram instead of the couple's
 * real names, and a months-attending guest told to "pick one to
 * RSVP" (case-sensitive email join). One spec fences all three.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

async function deleteSite(request: APIRequestContext, subdomain: string) {
  await request.delete(`/api/sites/${encodeURIComponent(subdomain)}`).catch(() => {});
}

test.describe('the guest passport, phone-first', () => {
  test('390px: no horizontal scroll, real names, real RSVP state', async ({ request, browser }) => {
    test.setTimeout(180_000);
    const stamp = Date.now().toString(36);
    const slug = `fence-pass-${stamp}`;
    const guestEmail = `pass-guest-${stamp}@fence.pearloom.test`;

    const names: [string, string] = ['Hazel', 'Rowan'];
    const manifest = {
      occasion: 'wedding',
      names,
      published: true,
      publishedAt: new Date().toISOString(),
      logistics: { date: '2027-10-16', venue: 'The Orchard Room' },
      theme: { colors: { accent: '#7a8b5c' } },
      // The playlist card renders when music suggestions are on.
      music: { suggestions: true },
    };
    const created = await request.post('/api/sites', {
      data: { create: true, subdomain: slug, names, manifest: { ...manifest, published: false } },
    });
    expect(created.ok()).toBeTruthy();
    const finalSlug = (await created.json()).subdomain as string;

    try {
      const published = await request.post('/api/sites/publish', {
        data: { subdomain: finalSlug, names, manifest },
      });
      expect(published.ok()).toBeTruthy();

      // A real guest on the host's list, with their personal token…
      const guestRes = await request.post('/api/guests', {
        data: { siteSlug: finalSlug, name: 'Priya Patel', email: guestEmail },
      });
      expect(guestRes.ok()).toBeTruthy();
      const guest = (await guestRes.json()).guest as { passport_token?: string };
      expect(guest.passport_token, 'guest row carries a passport token').toBeTruthy();

      // …who replied "attending" long ago (email typed in a
      // different CASE than the host stored — the exact join the
      // old lookup missed).
      const rsvp = await request.post('/api/rsvp', {
        data: {
          siteId: finalSlug,
          guestName: 'Priya Patel',
          email: guestEmail.toUpperCase(),
          status: 'attending',
        },
      });
      expect(rsvp.ok()).toBeTruthy();

      const phone = await browser.newContext({
        viewport: { width: 390, height: 844 },
        storageState: { cookies: [], origins: [] },
      });
      const page = await phone.newPage();
      await page.goto(`/g/${guest.passport_token}`, { waitUntil: 'domcontentloaded' });
      await expect
        .poll(async () => page.evaluate(() => document.body.innerText.length), { timeout: 20_000 })
        .toBeGreaterThan(200);

      // 1 · Phone-first: the page never scrolls sideways.
      const widths = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(widths.doc, 'documentElement scrollWidth').toBeLessThanOrEqual(392);
      expect(widths.body, 'body scrollWidth').toBeLessThanOrEqual(392);

      const text = await page.evaluate(() => document.body.innerText);
      // 2 · Signed by the couple's real names, not "Us".
      expect(text).toContain('Hazel');
      expect(text).not.toMatch(/\bU S\b/);
      // 3 · The guest's real reply state ("Priya, you're going."),
      //     not "pick one". Apostrophe-form tolerant.
      expect(text.toLowerCase()).toMatch(/you.re going/);
      expect(text.toLowerCase()).not.toContain('pick one to rsvp');
      await phone.close();
    } finally {
      await deleteSite(request, finalSlug);
    }
  });
});
