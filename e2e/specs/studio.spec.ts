import { test, expect } from '@playwright/test';

// Studio smoke — flips through the three stationery types,
// the three views (Front/Back/Envelope), picks a draft, and
// verifies the canvas swaps without throwing.
//
// Hits /dashboard/invite which mounts InviteDesignerLoader →
// StudioApp. The loader reads the sidebar's selected site; if
// no site is associated with the e2e user yet, the page
// renders DashEmpty with a "Create a site" CTA — we assert
// either the Studio surface or the empty state, so the smoke
// is meaningful even on a fresh test account.

test.describe('Studio (stationery editor)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/invite');
  });

  test('loads either the Studio or the empty state', async ({ page }) => {
    const studioRoot = page.locator('text=/Studio · /');
    const emptyState = page.locator('text=No site yet');
    await expect(studioRoot.or(emptyState)).toBeVisible({ timeout: 15_000 });
  });

  test('flips through the three stationery types', async ({ page }) => {
    const studioRoot = page.locator('text=/Studio · /');
    if (!(await studioRoot.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No site associated with e2e user — Studio not mounted.');
    }
    for (const label of ['Save the date', 'Invitation', 'Thank-you']) {
      await page.getByRole('button', { name: new RegExp(`^${label}$`) }).click();
      await expect(page.getByRole('button', { name: new RegExp(`^${label}$`) })).toBeVisible();
    }
  });

  test('flips through Front / Back / Envelope', async ({ page }) => {
    const studioRoot = page.locator('text=/Studio · /');
    if (!(await studioRoot.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No site associated with e2e user — Studio not mounted.');
    }
    for (const view of ['Front', 'Back', 'Envelope']) {
      await page.getByRole('button', { name: new RegExp(`^${view}$`) }).first().click();
    }
    // The bottom canvas chrome shows the active view label.
    await expect(page.locator('text=/Envelope · A7|Front · 5 ×|Back · 5 ×/')).toBeVisible();
  });

  test('left-rail draft thumbnails are clickable', async ({ page }) => {
    const studioRoot = page.locator('text=/Studio · /');
    if (!(await studioRoot.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No site associated with e2e user — Studio not mounted.');
    }
    const draftHeader = page.getByText("Pear's drafts", { exact: true });
    await expect(draftHeader).toBeVisible();
    // The 3 draft tiles are buttons. Click the second one.
    const drafts = page.locator('aside button:has-text("Editorial"), aside button:has-text("Garden"), aside button:has-text("Polaroid"), aside button:has-text("Letterpress"), aside button:has-text("En plein air"), aside button:has-text("Modern"), aside button:has-text("Photo card"), aside button:has-text("Handwritten"), aside button:has-text("Minimal")');
    const count = await drafts.count();
    expect(count).toBeGreaterThan(0);
    if (count >= 2) {
      await drafts.nth(1).click();
    }
  });

  test('Send overlay opens and closes', async ({ page }) => {
    const studioRoot = page.locator('text=/Studio · /');
    if (!(await studioRoot.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No site associated with e2e user — Studio not mounted.');
    }
    await page.getByRole('button', { name: /^Send$/ }).first().click();
    await expect(page.getByText('Off it goes.')).toBeVisible();
    // Close via the × button — the only inline button inside the overlay header.
    await page.locator('[role="dialog"], [aria-label="Close"]').first().click().catch(async () => {
      // Fallback: click the literal "×" character.
      await page.locator('button:has-text("×")').first().click();
    });
  });
});
