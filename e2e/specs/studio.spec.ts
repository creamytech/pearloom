import { test, expect, type Page } from '@playwright/test';

// Studio smoke — flips through the three stationery types,
// the three views (Front/Back/Envelope), picks a draft, and
// opens the Send overlay.
//
// Hits /dashboard/invite?site=playwright-test which causes
// InviteDesignerLoader to skip the sidebar's useSelectedSite
// fetch and pull the manifest directly. We intercept the
// network so the e2e user doesn't need a real Supabase site:
//
//   GET  /api/sites/playwright-test  → synthetic manifest
//   GET  /api/sites                  → empty list
//   POST /api/sites                  → autosave ack (no-op)
//   GET  /api/guests*                → empty list (Send needs it)

const TEST_SLUG = 'playwright-test';

const SYNTHETIC_MANIFEST = {
  occasion: 'wedding',
  names: ['Emma', 'James'],
  logistics: {
    date: '2026-09-12',
    venue: 'The Olive Grove',
    venueAddress: '12 Lane St, Sonoma, CA',
    rsvpDeadline: '2026-08-01',
  },
  studio: {},
};

async function installStudioMocks(page: Page) {
  await page.route('**/api/sites/playwright-test', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'pw-site-1',
        subdomain: TEST_SLUG,
        names: ['Emma', 'James'],
        manifest: SYNTHETIC_MANIFEST,
        eventDate: SYNTHETIC_MANIFEST.logistics.date,
        published: false,
        occasion: 'wedding',
      }),
    });
  });
  await page.route('**/api/sites', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    if (method === 'GET') {
      // useSelectedSite reads this; return an empty list so the
      // hook resolves loading=false. The page reads its slug from
      // ?site= directly, so an empty list doesn't block us.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sites: [] }),
      });
      return;
    }
    await route.continue();
  });
  await page.route(/\/api\/guests(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ guests: [] }),
    });
  });
}

test.describe('Studio (stationery editor)', () => {
  test.beforeEach(async ({ page }) => {
    await installStudioMocks(page);
    await page.goto(`/dashboard/invite?site=${TEST_SLUG}`);
    // Wait for StudioApp to mount — the topbar shows "Studio · A & B".
    await expect(page.getByText(/Studio · /)).toBeVisible({ timeout: 20_000 });
  });

  test('flips through the three stationery types', async ({ page }) => {
    for (const label of ['Save the date', 'Invitation', 'Thank-you']) {
      await page.getByRole('button', { name: new RegExp(`^${label}$`) }).click();
      await expect(page.getByRole('button', { name: new RegExp(`^${label}$`) })).toBeVisible();
    }
  });

  test('flips through Front / Back / Envelope', async ({ page }) => {
    for (const view of ['Front', 'Back', 'Envelope']) {
      await page.getByRole('button', { name: new RegExp(`^${view}$`) }).first().click();
    }
    // Bottom canvas chrome reflects the active view.
    await expect(page.getByText(/Envelope · A7|Front · 5 ×|Back · 5 ×/)).toBeVisible();
  });

  test('left-rail draft thumbnails are clickable', async ({ page }) => {
    await expect(page.getByText("Pear's drafts", { exact: true })).toBeVisible();
    // Each draft tile is a button inside the left aside, named by
    // its draft label (Editorial / Garden / Polaroid / etc).
    const drafts = page.locator(
      'aside button:has-text("Editorial"), aside button:has-text("Garden"), aside button:has-text("Polaroid"), aside button:has-text("Letterpress"), aside button:has-text("En plein air"), aside button:has-text("Modern"), aside button:has-text("Photo card"), aside button:has-text("Handwritten"), aside button:has-text("Minimal")',
    );
    const count = await drafts.count();
    expect(count).toBeGreaterThan(0);
    if (count >= 2) {
      await drafts.nth(1).click();
    }
  });

  test('Send overlay opens and closes', async ({ page }) => {
    await page.getByRole('button', { name: /^Send$/ }).first().click();
    // Default stationery type is 'invite' → "Off it goes." headline.
    await expect(page.getByText('Off it goes.')).toBeVisible();
    await page.getByRole('button', { name: /Close send overlay/i }).click();
    await expect(page.getByText('Off it goes.')).not.toBeVisible();
  });
});
