/*
 * phone-access.spec.ts — Sprint A's fence (the 390px + access pass).
 *
 * Pins the phone-and-keyboard contracts the audit found broken so
 * they can't quietly regress:
 *   L54  — the wizard Basics grid stacks to ONE column at 390px
 *          (the crush came back twice: once via inline styles, once
 *          via a span-2 child conjuring an implicit column).
 *   L110 — occasion cards announce selection (aria-pressed).
 *   L101 — signup inputs are ≥16px (iOS zoom) and the password
 *          toggle is a ≥44px tap target.
 *   L23  — hero name units are inline-block (breaks between names,
 *          never inside them), on a real pressed site.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

async function deleteSite(request: APIRequestContext, subdomain: string) {
  await request.delete(`/api/sites/${encodeURIComponent(subdomain)}`).catch(() => {});
}

test.describe('the 390px funnel', () => {
  test('wizard Basics stacks to one column and occasion cards announce selection', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/wizard/new', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Occasion cards carry aria-pressed (L110)…
    const wedding = page.getByRole('button', { name: /Wedding/ }).first();
    await expect(wedding).toHaveAttribute('aria-pressed', /true|false/, { timeout: 30_000 });
    // …and picking one announces it.
    await wedding.click();
    await expect(wedding).toHaveAttribute('aria-pressed', 'true');

    // The pick advances to Basics — the grid must be ONE column wide
    // at this viewport, with full-width fields (L54).
    const grid = page.locator('.pl8-basics-grid').first();
    await expect(grid).toBeVisible({ timeout: 20_000 });
    const cols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(cols).toBe(1);
    const nameField = grid.locator('input').first();
    const gridBox = await grid.boundingBox();
    const fieldBox = await nameField.boundingBox();
    expect(fieldBox!.width).toBeGreaterThan(gridBox!.width * 0.9);
  });

  test('signup inputs never trigger iOS zoom; the eye is a real tap target (L101)', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    for (const id of ['su-name', 'su-email', 'su-password']) {
      const size = await page.locator(`#${id}`).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(size, `#${id} font-size`).toBeGreaterThanOrEqual(16);
    }
    const eye = page.getByRole('button', { name: /Show password/i });
    const box = await eye.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('the published hero at 390px', () => {
  test('name units are inline-block — breaks between names, never inside (L23)', async ({ page, request }) => {
    test.setTimeout(120_000);
    const stamp = Date.now().toString(36);
    const created = await request.post('/api/sites', {
      data: {
        create: true,
        pressKey: `pa-${stamp}-abcdef12`,
        subdomain: `fence-phone-${stamp}`,
        names: ['Maya', 'Daniel'] as [string, string],
        manifest: {
          occasion: 'wedding',
          names: ['Maya', 'Daniel'],
          logistics: { date: '2027-09-04', venue: 'Access Hall' },
          published: true,
          publishedAt: new Date().toISOString(),
          visibility: 'public',
        },
      },
    });
    expect(created.ok()).toBeTruthy();
    const slug = (await created.json()).subdomain as string;
    try {
      await page.goto(`/sites/${slug}`, { waitUntil: 'domcontentloaded' });
      const h1 = page.locator('.pl8-hero-display').first();
      await expect(h1).toBeVisible({ timeout: 30_000 });
      const displays = await h1.evaluate((el) =>
        [...el.querySelectorAll(':scope > span')].map((s) => getComputedStyle(s).display),
      );
      expect(displays.length).toBeGreaterThanOrEqual(2);
      for (const d of displays) expect(d).toBe('inline-block');
      // Both names present; the visual gap is margin, not text, so
      // innerText legitimately reads "MayaandDaniel" — the mid-word
      // protection is the inline-block boxes asserted above.
      const text = await h1.innerText();
      expect(text).toContain('Maya');
      expect(text).toContain('Daniel');
    } finally {
      await deleteSite(request, slug);
    }
  });
});
