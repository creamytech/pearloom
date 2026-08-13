/*
 * one-pressing.spec.ts — the merge's funnel fence (C.5, behind the
 * onePressing flag).
 *
 * The flag contract: /wizard/new stays the classic wizard by
 * default; ?press=one swaps in the merged surface — the live
 * pressing behind a floating prompt card — which creates through
 * the SAME idempotent path (pressKey) and hands off to the editor.
 * The classic path must stay byte-for-byte primary while the flag
 * is off.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

async function deleteSite(request: APIRequestContext, subdomain: string) {
  await request.delete(`/api/sites/${encodeURIComponent(subdomain)}`).catch(() => {});
}

test.describe('the one-pressing flag', () => {
  test('off by default — the classic wizard renders untouched', async ({ page }) => {
    await page.goto('/wizard/new', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=What are we celebrating?')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-one-pressing]')).toHaveCount(0);
  });

  test('?press=one presses a site live behind the prompts and lands in the editor', async ({ page, request }) => {
    test.setTimeout(180_000);
    await page.goto('/wizard/new?press=one', { waitUntil: 'domcontentloaded' });
    const surface = page.locator('[data-one-pressing]');
    await expect(surface).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('text=Your site, taking shape')).toBeVisible();

    // Occasion → names.
    await page.getByRole('button', { name: 'Wedding', exact: true }).click();
    await page.locator('#op-name-a').fill('Rio');
    await page.locator('#op-name-b').fill('Ash');
    // The live pressing behind the card carries the typed name.
    await expect
      .poll(async () => page.evaluate(() => document.body.innerText), { timeout: 15_000 })
      .toContain('Rio');

    // exact — the Next.js dev-tools button also answers to "Next".
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.locator('#op-venue').fill('Fence Grove');
    await page.getByRole('button', { name: 'Press my site' }).click();

    // The press lands in the editor at the created slug.
    await page.waitForURL(/\/editor\//, { timeout: 60_000 });
    const slug = decodeURIComponent(page.url().split('/editor/')[1].split('?')[0]);
    expect(slug).toContain('rio');

    try {
      // Exactly one site — the merged press rides the W.2 pressKey
      // contract, so no double-create class returns. (The listing
      // exposes the slug as `domain`.)
      const mine = await (await request.get('/api/sites')).json() as { sites?: Array<{ domain?: string }> };
      const matches = (mine.sites ?? []).filter((s) => (s.domain ?? '').startsWith('rio-and-ash'));
      expect(matches.length).toBe(1);
    } finally {
      await deleteSite(request, slug);
    }
  });
});
