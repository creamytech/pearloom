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
  // Set the site theme accent to the exact sage palette accent
  // — the Studio's "Match this card to your site theme" button
  // picks the palette with the smallest RGB distance.
  theme: { colors: { accent: '#8B9C5A' } },
  // Events + travelInfo populate the Save-the-date back's
  // ceremony / reception / dress code / stay-nearby strip.
  events: [
    { id: 'e1', type: 'ceremony',  name: 'Ceremony',  time: '4:00 PM', dressCode: 'Garden formal' },
    { id: 'e2', type: 'reception', name: 'Reception', time: '6:00 PM' },
  ],
  travelInfo: {
    hotels: [{ name: 'The Sonoma Inn', groupRate: '20% off' }],
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

  test('Save-the-date back surfaces ceremony / reception / hotel from manifest', async ({ page }) => {
    // Switch to Save-the-date stationery type, then to Back view.
    await page.getByRole('button', { name: /^Save the date$/ }).click();
    await page.getByRole('button', { name: /^Back$/ }).first().click();
    // The back card renders the events + hotel from the manifest.
    const card = page.locator('main');
    await expect(card.getByText('4:00 PM').first()).toBeVisible();
    await expect(card.getByText('6:00 PM').first()).toBeVisible();
    await expect(card.getByText('Garden formal').first()).toBeVisible();
    await expect(card.getByText(/The Sonoma Inn/).first()).toBeVisible();
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

  test('Copy tab edits a field inline and the canvas reflects it', async ({ page }) => {
    // Switch the right rail to the Copy tab.
    await page.getByRole('button', { name: /^Copy$/ }).click();
    // The Eyebrow textarea shows the default invite copy.
    const eyebrow = page.locator('textarea').first();
    await expect(eyebrow).toBeVisible();
    const before = (await eyebrow.inputValue()).trim();
    expect(before.length).toBeGreaterThan(0);

    const NEW_TEXT = 'PLAYWRIGHT-TYPED EYEBROW';
    await eyebrow.fill(NEW_TEXT);
    // Commit on blur (Enter without shift).
    await eyebrow.press('Enter');

    // The new copy should appear inside the canvas card preview
    // — the front view always renders the eyebrow above the
    // headline, so look for the typed string in main.
    await expect(page.locator('main').filter({ hasText: NEW_TEXT }).first())
      .toBeVisible({ timeout: 5_000 });
  });

  test('cycles through every Layout without throwing', async ({ page }) => {
    // Layout buttons live in the right rail (Design tab is the
    // default tab on mount). Each click should keep the canvas
    // intact and keep the couple's names rendered on the card.
    const card = page.locator('main').filter({ hasText: 'Emma' }).first();
    for (const label of ['Classic', 'Asymmetric', 'Photo-led', 'Letter', 'Minimal']) {
      // Layout names appear on the right rail's layout grid; some
      // also appear on draft tiles in the left rail. Scope the
      // click to buttons whose accessible name STARTS with the
      // layout label and the layout sub-text (e.g. "Classic
      // centered · airy") to disambiguate.
      const btn = page.getByRole('button', { name: new RegExp(`^${label}\\b`) }).last();
      await btn.click();
      // Card text re-renders with the names — confirm we didn't
      // crash the canvas.
      await expect(card).toBeVisible();
    }
  });

  test('cycles through every Palette without throwing', async ({ page }) => {
    const card = page.locator('main').filter({ hasText: 'Emma' }).first();
    // Palette tile buttons are titled with their display name.
    for (const title of ['Dusk', 'Garden', 'Apricot', 'Letterpress', 'Twilight', 'Plum']) {
      const btn = page.locator(`button[title="${title}"]`);
      const count = await btn.count();
      if (count === 0) continue; // not all palettes ship with a tile
      await btn.first().click();
      await expect(card).toBeVisible();
    }
  });

  test('Pear field rewrite swaps the canvas copy', async ({ page }) => {
    const REWRITTEN = 'PEAR-REWROTE-EYEBROW';
    let captured: string | null = null;
    await page.route('**/api/studio/rewrite', async (route) => {
      captured = route.request().postData();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rewritten: REWRITTEN }),
      });
    });

    await page.getByRole('button', { name: /^Copy$/ }).click();
    // Expand the Eyebrow field's Rewrite panel.
    const eyebrowRewriteBtn = page.locator('div').filter({ hasText: /^Eyebrow$/ }).first()
      .locator('xpath=..').getByRole('button', { name: /Rewrite/ });
    await eyebrowRewriteBtn.click();
    // Click the first canned hint.
    await page.getByRole('button', { name: /A different angle on the same idea/ }).click();

    // The captured request body should include fieldId=eyebrow.
    await expect.poll(() => captured).not.toBeNull();
    expect(captured).toContain('"fieldId":"eyebrow"');
    expect(captured).toContain('"type":"invite"');

    // Canvas should reflect the rewritten copy.
    await expect(page.locator('main').filter({ hasText: REWRITTEN }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('Copy overrides are scoped per stationery type', async ({ page }) => {
    await page.getByRole('button', { name: /^Copy$/ }).click();
    const eyebrow = () => page.locator('textarea').first();

    // Type override on the default "Invitation" type.
    await eyebrow().fill('INVITE-ALPHA');
    await eyebrow().press('Enter');
    await expect(page.locator('main').filter({ hasText: 'INVITE-ALPHA' }).first()).toBeVisible();

    // Switch to Save-the-date — the eyebrow text should be the
    // STD default, NOT the invite override.
    await page.getByRole('button', { name: /^Save the date$/ }).click();
    // Re-open Copy tab (the right-rail tab state isn't reset,
    // but make sure the textarea is visible on this type too).
    const stdEyebrowValue = await eyebrow().inputValue();
    expect(stdEyebrowValue).not.toContain('INVITE-ALPHA');

    // Type a different override on Save-the-date.
    await eyebrow().fill('STD-BETA');
    await eyebrow().press('Enter');
    await expect(page.locator('main').filter({ hasText: 'STD-BETA' }).first()).toBeVisible();

    // Flip back to Invitation — should still read "INVITE-ALPHA".
    await page.getByRole('button', { name: /^Invitation$/ }).click();
    const inviteAfter = await eyebrow().inputValue();
    expect(inviteAfter).toBe('INVITE-ALPHA');
    await expect(page.locator('main').filter({ hasText: 'INVITE-ALPHA' }).first()).toBeVisible();
  });

  test('changes are persisted to /api/sites within the debounce window', async ({ page }) => {
    // useStudioState debounces autosave by 1500ms. Override the
    // /api/sites POST mock so we can capture the manifest body.
    let lastPostBody: string | null = null;
    await page.route('**/api/sites', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        lastPostBody = route.request().postData();
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
        return;
      }
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"sites":[]}' });
        return;
      }
      await route.continue();
    });

    // Make a change. Switching palette is the cheapest signal —
    // it bumps state.palette, which the autosave watches.
    await page.locator('button[title="Garden"]').first().click();

    // Wait for the 1500ms debounce + a small buffer.
    await expect.poll(async () => lastPostBody, { timeout: 5_000 }).not.toBeNull();
    expect(lastPostBody).toContain('"palette":"sage"');
    expect(lastPostBody).toContain('"subdomain":"playwright-test"');
  });

  test('Match-site-theme switches the palette to the closest match', async ({ page }) => {
    // The synthetic manifest seeds theme.colors.accent = sage
    // accent, so clicking "Match this card to your site theme"
    // should switch the active palette to Garden (sage).
    await page.getByRole('button', { name: /^Pear$/ }).click();
    // The Garden palette tile shouldn't be the selected one yet
    // — the default is Dusk (lavender). Selected tiles get a
    // 2px ink border; that's hard to assert reliably across
    // styles, so instead verify via the Palette section sub-text
    // in the Design tab after we click match.
    await page.getByRole('button', { name: /Match this card to your site theme/i }).click();
    // Switch back to Design tab and confirm the Palette sub
    // reads "olive · sage" (Garden's sub).
    await page.getByRole('button', { name: /^Design$/ }).click();
    await expect(page.getByText(/olive · sage/)).toBeVisible({ timeout: 5_000 });
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
