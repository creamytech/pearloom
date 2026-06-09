// ─────────────────────────────────────────────────────────────
// tests/e2e/theme-packs.spec.ts
//
// Per-pack visual regression for the 58 Theme-Store packs.
//
// For every Pack id in src/lib/theme-store/packs.ts, this suite:
//   1. Navigates to /dev/theme-pack/<id> (dev-only route).
//   2. Waits for fonts to settle so type metrics are stable
//      across runs.
//   3. Screenshots the hero / story / details / rsvp sections at
//      1280x800 and diffs against the baseline under
//      __screenshots__/theme-packs.spec.ts/.
//
// First run seeds baselines; subsequent runs catch drift.
// Regenerate when intentional with:
//   npx playwright test tests/e2e/theme-packs.spec.ts \
//     --project=theme-packs-visual --update-snapshots
//
// Run a single pack while debugging:
//   npx playwright test tests/e2e/theme-packs.spec.ts \
//     --project=theme-packs-visual -g "santorini-linen"
// ─────────────────────────────────────────────────────────────

import { test, expect, type Page } from '@playwright/test';
import { PACKS } from '@/lib/theme-store/packs';

/* The four sections we baseline per pack. Each id matches the
   anchor TSection emits in src/components/pearloom/redesign/
   ThemedSite.tsx — keep this list in sync if a section is
   renamed or added. */
const SECTIONS = ['hero', 'story', 'details', 'rsvp'] as const;
type SectionId = typeof SECTIONS[number];

/* Wait for every @font-face declaration on the page to finish
   loading. Font-render swaps mid-screenshot are the single biggest
   source of false-positive diffs in this kind of suite. */
async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (typeof document === 'undefined') return;
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    if (fonts?.ready) await fonts.ready;
  });
}

/* Force CSS transitions + Framer-Motion animations to settle and
   pin the pearl-phase var so two consecutive screenshots of the
   same pack don't diff over the 24s pearl-drift loop. */
async function freezeAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      :root { --pl-pearl-phase: 48deg !important; }
    `,
  });
}

/* Screenshot a single section locator with a small tolerance.
   We screenshot the SECTION rather than the full page so the
   diff is scoped to one piece of the renderer at a time — a
   regression in the divider doesn't blow up the hero baseline. */
async function snapshotSection(page: Page, packId: string, section: SectionId): Promise<void> {
  const locator = page.locator(`#${section}`);
  await expect(locator, `section #${section} missing on /dev/theme-pack/${packId}`).toBeVisible({ timeout: 10_000 });
  await locator.scrollIntoViewIfNeeded();
  // Settle layout shifts (lazy images, decor svgs, etc.) before
  // the actual snapshot. 250ms is the prototype's typical
  // post-mount paint budget.
  await page.waitForTimeout(250);
  await expect(locator).toHaveScreenshot(`${packId}__${section}.png`, {
    animations: 'disabled',
    maxDiffPixelRatio: 0.002,
  });
}

/* Generate one test per pack. Each test stands on its own so a
   single regression doesn't poison the rest of the report, and
   so `--shard` can split the 58 packs across CI runners. */
for (const pack of PACKS) {
  test(`theme pack: ${pack.id}`, async ({ page }) => {
    const response = await page.goto(`/dev/theme-pack/${pack.id}`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });

    // If the dev-only route 404s in this environment (e.g. someone
    // ran the suite against NODE_ENV=production), fail loudly so
    // the operator knows why instead of seeing 58 silent diffs.
    expect(response, `no response for pack ${pack.id}`).not.toBeNull();
    expect(response?.status(), `dev-only route returned ${response?.status()} — is NODE_ENV !== production?`).toBeLessThan(400);

    await waitForFonts(page);
    await freezeAnimations(page);

    for (const section of SECTIONS) {
      await snapshotSection(page, pack.id, section);
    }
  });
}

/* Sanity check — if the PACKS export ever drifts away from 70 we
   want to know at suite start, not page-by-page. The literal 70
   is intentional: PR'ing a new pack should require updating this
   number so the addition is deliberate and the diff list explicit.
   (58 → 62 on 2026-06-09: First Thread, Magnolia Porch, Gilded
   Coupe, Paper Lanterns; 62 → 70 same day: Opera House, The Gallery, Tasting Menu, Sakura Drift, Mirrorball, Conservatory, Noël Press, Safe Harbor.) *
test('pack catalog count is stable', () => {
  expect(PACKS.length).toBe(70);
});
