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

  test('Send button hits /api/invite/guest and shows the result', async ({ page }) => {
    // Override the guests mock so Send is enabled (withEmail > 0).
    await page.route(/\/api\/guests(\?|$)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          guests: [
            { id: 'g1', name: 'Alice',  email: 'alice@example.test',  phone: null,    address: null, status: 'attending' },
            { id: 'g2', name: 'Bob',    email: 'bob@example.test',    phone: '555-1', address: null, status: 'attending' },
            { id: 'g3', name: 'Carlos', email: null,                  phone: null,    address: '1 St',status: 'pending' },
          ],
        }),
      });
    });

    let sendBodyCaptured: string | null = null;
    await page.route('**/api/invite/guest', async (route) => {
      sendBodyCaptured = route.request().postData();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sent: 2, failed: 0 }),
      });
    });

    await page.getByRole('button', { name: /^Send$/ }).first().click();
    await expect(page.getByText('Off it goes.')).toBeVisible();

    // Send button should reflect the email count and be enabled.
    const sendBtn = page.getByRole('button', { name: /Send to 2/ });
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Success status text appears with the sent count.
    await expect(page.getByText(/Sent to 2/)).toBeVisible({ timeout: 10_000 });
    expect(sendBodyCaptured).not.toBeNull();
    expect(sendBodyCaptured).toContain('"subdomain":"playwright-test"');
  });

  test('Pear asset generation prepends a new asset to the palette', async ({ page }) => {
    await page.route('**/api/studio/asset', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          asset: {
            id: 'ai-stamp-pw-1',
            kind: 'stamp',
            tone: 'lavender',
            text: 'PLAYWRIGHT',
            icon: 'sparkle',
            url: 'https://example.test/pw-stamp.png',
          },
        }),
      });
    });

    // Open the asset palette in the left rail.
    const palette = page.locator('aside').filter({ hasText: 'Drag onto card' });
    await expect(palette).toBeVisible();
    const before = await palette.locator('button[title]').count();

    // Trigger Pear stamp generation. The button copy is "✦ Pear · stamp".
    await page.getByRole('button', { name: /Pear\s*·\s*stamp/i }).click();

    await expect.poll(async () => palette.locator('button[title]').count(), { timeout: 10_000 }).toBe(before + 1);
  });

  test('Pear draft generation surfaces the new directions', async ({ page }) => {
    // Mock /api/studio/draft to return a deterministic synthetic
    // set; clicking "Draft another direction" should swap the
    // left-rail drafts to these names.
    await page.route('**/api/studio/draft', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          drafts: [
            { id: 'aurora',  name: 'Aurora',  tone: 'serif · stamped',  accent: 'lavender', layout: 'classic', motif: 'stamp' },
            { id: 'meadow',  name: 'Meadow',  tone: 'olive · pressed',  accent: 'sage',     layout: 'asym',    motif: 'leaves' },
            { id: 'amber',   name: 'Amber',   tone: 'photo · taped',    accent: 'peach',    layout: 'photo',   motif: 'tape' },
          ],
        }),
      });
    });

    // Pear's drafts panel is the left rail's first section.
    await expect(page.getByText("Pear's drafts", { exact: true })).toBeVisible();
    // Trigger the draft request — button label is "Draft another direction".
    await page.getByRole('button', { name: /Draft another direction/i }).click();
    // After the mocked response, the new draft names should
    // appear in the left rail. The draft tile's accessible name
    // includes the card preview text ("Emma & James Aurora serif
    // · stamped"), so match buttons that contain each draft name.
    await expect(page.locator('aside button').filter({ hasText: 'Aurora' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('aside button').filter({ hasText: 'Meadow' })).toBeVisible();
    await expect(page.locator('aside button').filter({ hasText: 'Amber' })).toBeVisible();
  });
});
