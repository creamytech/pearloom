/*
 * doorway.spec.ts — THE DOORWAY CONTRACT, pinned end-to-end.
 *
 * REVIEW-SYNTHESIS §1.5 / proxy.ts MUST_STAY_OPEN_PREFIXES: auth
 * belongs at SAVE and PUBLISH, never at the door. A signed-out
 * visitor must reach the wizard from every entrance.
 *
 * History: proxy.test.ts pinned the contract at the proxy layer only,
 * and app/wizard/layout.tsx re-instated the signup wall ABOVE it in
 * 2026-08 — no test noticed (docs/NEW-USER-REVAMP.md H1). This spec
 * pins the contract at the only layer that can't be bypassed: the
 * rendered funnel itself. If any route segment, layout, middleware,
 * or client redirect walls the creation surfaces again, this fails.
 */

import { test, expect } from '@playwright/test';

// The whole point is the signed-out experience — never reuse the
// studio suite's authenticated storageState.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('the doorway contract (signed out)', () => {
  test('/wizard/new opens the wizard, not a login wall', async ({ page }) => {
    await page.goto('/wizard/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    expect(page.url()).not.toContain('/login');
    await expect(page.locator('text=What are we celebrating?')).toBeVisible({ timeout: 30_000 });
  });

  test('/start (the express door) is reachable and continues into creation, not login', async ({ page }) => {
    await page.goto('/start', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    expect(page.url()).not.toContain('/login');
    await expect(page.locator('text=Give us what you already have.')).toBeVisible({ timeout: 30_000 });
  });

  test('the landing primary CTA lands a visitor in the wizard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    // The hero CTA is a button (client-side navigation).
    await page.locator('button:has-text("Create your site"), a:has-text("Create your site")')
      .last()
      .click({ force: true });
    await page.waitForURL(/\/(wizard|start)/, { timeout: 45_000 });
    expect(page.url()).not.toContain('/login');
  });

  test('the signed-out press reaches the claim card, and the draft survives to signup', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/wizard/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Occasion → Basics
    await page.locator('button:has-text("Wedding")').first().click({ force: true });
    await page.waitForTimeout(700);
    const next = async () => {
      await page.locator('button', { hasText: 'Continue' }).last().click({ force: true });
      await page.waitForTimeout(1400);
    };
    await next();

    const inputs = await page.locator('input:visible').all();
    await inputs[0].fill('Doorway');
    await inputs[1].fill('Fence');

    // Walk the remaining steps to Review (defaults are fine everywhere).
    for (let i = 0; i < 7; i++) await next();
    await page.waitForTimeout(1500);

    // Press the seal (the monogram disc button carries "D·F").
    const seal = page.locator('button', { hasText: 'D·F' }).first();
    await seal.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await seal.click();

    // Signed out, the press must persist the draft and forward to the
    // claim card on /signup — never silently drop the work.
    await page.waitForURL(/\/signup\?next=/, { timeout: 60_000 });
    await expect(page.locator('text=Claim your')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=Doorway & Fence')).toBeVisible({ timeout: 15_000 });
  });
});
