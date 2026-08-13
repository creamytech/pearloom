/*
 * money-door.spec.ts — THE ONE UPGRADE DOOR (M.2/L37 + M.8/L83).
 *
 * Before /upgrade existed, no upgrade affordance reached the till:
 * the landing's "Choose Pass" dropped its plan intent into
 * /wizard/new, and the 402s' upgradeUrl pointed at a query param
 * nothing read. This spec pins the door end-to-end on the keyless
 * staging stack:
 *
 *   1. Signed out, /upgrade?plan= carries the intent through /login.
 *   2. Signed in, the door renders BOTH paid cards from the same
 *      TIERS array the pricing page renders (fence-pinned numbers).
 *   3. ?from=<feature> names the limit the host met, in their plan's
 *      real numbers.
 *   4. The keyless till (hasStripe() false — always true on staging)
 *      degrades in host language: nothing-was-charged + a next step,
 *      never the server's "Payments are not configured."
 */

import { test, expect } from '@playwright/test';

test.describe('the upgrade door (signed in)', () => {
  test('renders both paid cards with the fence-pinned prices', async ({ page }) => {
    await page.goto('/upgrade', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Pass' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Keepsake' })).toBeVisible();
    await expect(page.locator('text=$89')).toBeVisible();
    await expect(page.locator('text=$199')).toBeVisible();
    // The one-time promise frames the page; subscription language is banned.
    await expect(page.locator('text=never a subscription')).toBeVisible();
    const body = (await page.textContent('main')) ?? '';
    expect(body).not.toMatch(/\/mo\b|monthly/i);
  });

  test('?from=sites names the limit the host just met', async ({ page }) => {
    await page.goto('/upgrade?plan=pass&from=sites', { waitUntil: 'domcontentloaded' });
    // The e2e account rides the free tier → "Your Page plan includes 2 sites…"
    await expect(page.locator('text=/Your Page plan includes 2 sites/')).toBeVisible({ timeout: 30_000 });
  });

  test('the keyless till degrades in host language, not server-speak', async ({ page }) => {
    await page.goto('/upgrade?plan=pass', { waitUntil: 'domcontentloaded' });
    // Dev-server hydration race: a pre-hydration click lands on a
    // handler-less button and nothing happens. Wait for quiet.
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Choose Pass' }).click();
    // Scoped to main — Next's route announcer is role=alert too.
    const alert = page.locator('main [role="alert"]');
    // What happened + nothing was charged + a next step (M.8/L83)…
    await expect(alert).toContainText(/nothing was charged/i, { timeout: 15_000 });
    await expect(alert).toContainText('hello@pearloom.com');
    // …and never the API's infrastructure-speak.
    await expect(alert).not.toContainText(/not configured|stripe/i);
  });
});

test.describe('the upgrade door (signed out)', () => {
  // A fresh, unauthenticated context — the intent must survive auth.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('/upgrade?plan=pass routes through login with the intent intact', async ({ page }) => {
    await page.goto('/upgrade?plan=pass', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login\?/, { timeout: 30_000 });
    const url = new URL(page.url());
    const next = url.searchParams.get('next') ?? '';
    expect(next).toContain('/upgrade');
    expect(next).toContain('plan=pass');
  });
});
