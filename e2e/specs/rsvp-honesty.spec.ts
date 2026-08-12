/*
 * rsvp-honesty.spec.ts — the RSVP form asks only honest questions,
 * in the occasion's own register (Sprint G.2 + G.3).
 *
 * Two fences:
 *  1. A MEMORIAL's reply form wears memorial language — "I'll attend",
 *     the memory-share question — and never the wedding's "Joyfully".
 *  2. A wedding with NO host-configured menu asks no meal question and
 *     stores no meal_preference; nothing is pre-selected, so the send
 *     button waits for a real answer.
 */

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

async function deleteSite(request: APIRequestContext, subdomain: string) {
  await request.delete(`/api/sites/${encodeURIComponent(subdomain)}`).catch(() => {});
}

async function pressAndPublish(
  request: APIRequestContext,
  slug: string,
  occasion: string,
  names: [string, string],
) {
  const manifest = {
    occasion,
    names,
    published: true,
    publishedAt: new Date().toISOString(),
    logistics: { date: '2027-10-16', venue: 'The Orchard Room' },
    theme: { colors: { accent: '#7a8b5c' } },
  };
  const created = await request.post('/api/sites', {
    data: { create: true, subdomain: slug, names, manifest: { ...manifest, published: false } },
  });
  expect(created.ok()).toBeTruthy();
  const finalSlug = (await created.json()).subdomain as string;
  const published = await request.post('/api/sites/publish', {
    data: { subdomain: finalSlug, names, manifest },
  });
  expect(published.ok()).toBeTruthy();
  return finalSlug;
}

/** Walks the modal's find step as an uninvited guest ("open RSVP").
 *  The open event re-fires until the lazy-loaded modal answers —
 *  a single dispatch can land before React has hydrated the
 *  listener. */
async function openReplyForm(page: Page, guestName: string) {
  const nameInput = page.getByPlaceholder('Start typing your name…');
  await expect
    .poll(async () => {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('pl-open-rsvp')));
      return nameInput.isVisible();
    }, { timeout: 30_000, intervals: [500, 1000] })
    .toBe(true);
  await nameInput.fill(guestName);
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByText('Your reply')).toBeVisible({ timeout: 10_000 });
}

test.describe('the honest RSVP form', () => {
  test('a memorial asks in its own register — never "Joyfully"', async ({ request, browser }) => {
    test.setTimeout(180_000);
    const stamp = Date.now().toString(36);
    const slug = await pressAndPublish(request, `fence-mem-${stamp}`, 'memorial', ['Eleanor', 'Vance']);
    try {
      const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await anon.newPage();
      await page.goto(`/sites/${slug}`, { waitUntil: 'domcontentloaded' });
      await openReplyForm(page, 'Quiet Guest');

      const modalText = await page.evaluate(() => document.body.innerText);
      expect(modalText).not.toContain('Joyfully');
      expect(modalText).not.toContain('Regretfully');
      expect(modalText).toContain('I’ll attend');

      // Answering brings the memorial's own question up — the
      // memory-share field from the preset schema.
      await page.getByRole('button', { name: 'I’ll attend' }).click();
      await expect(page.getByText(/A memory, if you’d like to share one/)).toBeVisible();
      // And never a song request on a memorial.
      expect(await page.evaluate(() => document.body.innerText)).not.toContain('A song to get you dancing');
      await anon.close();
    } finally {
      await deleteSite(request, slug);
    }
  });

  test('a menu-less wedding asks no meal question and stores no meal', async ({ request, browser }) => {
    test.setTimeout(180_000);
    const stamp = Date.now().toString(36);
    const guestName = `Fence Guest ${stamp}`;
    const slug = await pressAndPublish(request, `fence-meal-${stamp}`, 'wedding', ['Hazel', 'Rowan']);
    try {
      const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await anon.newPage();
      await page.goto(`/sites/${slug}`, { waitUntil: 'domcontentloaded' });
      await openReplyForm(page, guestName);

      // Nothing pre-selected: the send button waits for an answer.
      const send = page.getByRole('button', { name: /Send our reply/ });
      await expect(send).toBeDisabled();

      // No host menu → no meal chips, and no invented "Chicken".
      expect(await page.evaluate(() => document.body.innerText)).not.toContain('Chicken');

      await page.getByRole('button', { name: 'Joyfully' }).click();
      await expect(send).toBeEnabled();
      const rsvpResponse = page.waitForResponse((r) => r.url().includes('/api/rsvp') && r.request().method() === 'POST', { timeout: 20_000 });
      await send.click();
      const rsvpRes = await rsvpResponse;
      expect(rsvpRes.status(), `POST /api/rsvp said: ${await rsvpRes.text().catch(() => '?')}`).toBeLessThan(300);
      await anon.close();

      // The stored row carries no meal the guest never chose.
      const rows = await request.get(`/api/guests?site=${encodeURIComponent(slug)}`);
      expect(rows.ok()).toBeTruthy();
      const data = await rows.json();
      const guests = (data.guests ?? data ?? []) as Array<Record<string, unknown>>;
      const mine = guests.find((g) => g.name === guestName);
      expect(mine, `the reply row exists in: ${JSON.stringify(data).slice(0, 400)}`).toBeTruthy();
      expect(mine?.status).toBe('attending');
      expect(mine?.meal_preference ?? null).toBeNull();
    } finally {
      await deleteSite(request, slug);
    }
  });
});
