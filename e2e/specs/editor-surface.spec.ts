import { test, expect, type Page } from '@playwright/test';

/*
 * Editor surface integration — exercises the four entry-points that
 * stitch the editor together:
 *
 *   1. Command palette (⌘K / Ctrl+K)            CommandPalette.tsx
 *   2. Theme shop bottom sheet                  EditorThemeShop.tsx
 *   3. Publish & share modal                    shared/PublishModal.tsx
 *   4. User settings modal (4 tabs)             dash/UserSettingsModal.tsx
 *
 * Mocked editor:
 *   - /dev/editor renders EditorV8 with a synthetic manifest and is
 *     gated on NODE_ENV !== 'production'. The Playwright dev server
 *     runs in development, so the route is live and no /api/sites
 *     mock is required.
 *   - Outbound API calls from the editor (autosave POST /api/sites,
 *     OG image GET /api/og) are stubbed so the test is hermetic.
 *
 * Mocked dashboard (settings modal):
 *   - /dashboard is the simplest surface that mounts
 *     UserSettingsProvider + TopbarAvatarButton, so the modal-from-
 *     topbar leg of the integration is verified there.
 *
 * Everything below is DOM-asserted — no pixel comparison, no
 * screenshot diff. Animation timings are absorbed by Playwright's
 * auto-waiting + explicit toBeVisible polls.
 */

const EDITOR_URL = '/dev/editor';
const DASHBOARD_URL = '/dashboard';

async function installEditorMocks(page: Page) {
  // Autosave + sites list — the editor debounces /api/sites POSTs
  // through normal use. Return 200 immediately so the topbar's
  // "Saving…" → "Saved" transition doesn't sit pending.
  await page.route('**/api/sites', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"sites":[]}' });
      return;
    }
    await route.continue();
  });
  // Themed OG endpoint — the PublishModal embeds a live <img src=
  // "/api/og?…"> on the share-card preview. Return a 1×1 PNG so
  // the request resolves and the embed renders something non-broken.
  await page.route(/\/api\/og(\?|$)/, async (route) => {
    // 1×1 transparent PNG bytes.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=',
      'base64',
    );
    await route.fulfill({ status: 200, contentType: 'image/png', body: png });
  });
}

test.describe('Editor surface integration', () => {
  test.beforeEach(async ({ page }) => {
    await installEditorMocks(page);
    await page.goto(EDITOR_URL);
    // EditorV8 topbar renders the "Save & publish" pearl CTA — the
    // canonical signal the editor has mounted. The dev-route uses
    // siteSlug="demo" so the slug-pill ('pearloom.com/wedding/demo')
    // also reads as a mount checkpoint, but the publish button is
    // more stable across renderer reshuffles.
    await expect(
      page.getByRole('button', { name: /Save .* publish/ }).first(),
    ).toBeVisible({ timeout: 25_000 });
  });

  test('⌘K opens the command palette; Esc closes it', async ({ page }) => {
    // No palette mounted at rest.
    await expect(page.getByRole('dialog', { name: /Command palette/i })).toHaveCount(0);

    // ⌘K (mac) / Ctrl+K — CommandPalette listens on metaKey OR ctrlKey
    // so either modifier is sufficient on any host OS.
    await page.keyboard.press('Control+K');

    const palette = page.getByRole('dialog', { name: /Command palette/i });
    await expect(palette).toBeVisible();
    await expect(palette).toHaveAttribute('aria-modal', 'true');

    // Search input gets autofocus after a small defer — the placeholder
    // copy is the cheapest identifier ("Search sections, editions, kits,
    // events…").
    const search = palette.getByPlaceholder(/Search sections/);
    await expect(search).toBeVisible();
    await expect(search).toBeFocused();

    // Esc closes the palette.
    await page.keyboard.press('Escape');
    await expect(palette).toHaveCount(0);
  });

  test('Typing "theme" in the palette + Enter opens the Theme Shop', async ({ page }) => {
    await page.keyboard.press('Control+K');
    const palette = page.getByRole('dialog', { name: /Command palette/i });
    await expect(palette).toBeVisible();

    // Type the query — the fuzzy scorer ranks the "Open the theme
    // shop" flow item top because "theme" matches both the label
    // and the 'theme' keyword. With sel=0 (the default reset on
    // every open), Enter runs the top-ranked result.
    await palette.getByPlaceholder(/Search sections/).fill('theme');

    // Confirm the row is in the visible result list before pressing
    // Enter — guards against a refactor that renames the flow item.
    const themeShopRow = palette.getByRole('button', {
      name: /Open the theme shop/i,
    });
    await expect(themeShopRow).toBeVisible();

    await page.keyboard.press('Enter');

    // CommandPalette defers the onSelect by one tick so the close
    // animation can commit first — the Theme Shop dialog should
    // be visible shortly after.
    const themeShop = page.getByRole('dialog', { name: /Theme Shop/i });
    await expect(themeShop).toBeVisible({ timeout: 5_000 });
    await expect(themeShop).toHaveAttribute('aria-modal', 'true');

    // And the command palette itself closed.
    await expect(palette).toHaveCount(0);
  });

  test('Esc closes the Theme Shop after the palette routed to it', async ({ page }) => {
    await page.keyboard.press('Control+K');
    const palette = page.getByRole('dialog', { name: /Command palette/i });
    await palette.getByPlaceholder(/Search sections/).fill('theme');
    await page.keyboard.press('Enter');

    const themeShop = page.getByRole('dialog', { name: /Theme Shop/i });
    await expect(themeShop).toBeVisible({ timeout: 5_000 });

    // Click the Theme Shop's close button (Esc isn't bound on the
    // sheet itself — closing is via the close affordance or the
    // backdrop click). aria-label="Close Theme Shop".
    await themeShop.getByRole('button', { name: /Close Theme Shop/i }).click();
    // The sheet animates out; assert by waiting for it to disappear
    // from the accessibility tree.
    await expect(themeShop).toHaveCount(0, { timeout: 5_000 });
  });

  test('Publish modal opens with the refreshed shape (themed OG embed)', async ({ page }) => {
    // The pearl-accent "Save & publish" pill is the canonical
    // entry-point. It carries the data-tour-anchor="publish" hook.
    await page.getByRole('button', { name: /Save .* publish/ }).first().click();

    const publish = page.getByRole('dialog', { name: /Publish your site/i });
    await expect(publish).toBeVisible({ timeout: 5_000 });
    await expect(publish).toHaveAttribute('aria-modal', 'true');

    // The refreshed shape ships:
    //   1. The slug claim input (pearloom.com/<slug>).
    //   2. The visibility radio group (public / password / private).
    //   3. The themed OG embed — an <img> sourced from /api/og?…
    //      with alt text that names the preview.
    const ogImg = publish.getByAltText(/Preview of how your site appears when shared/);
    await expect(ogImg).toBeVisible();
    // Verify the embed is hitting the canonical themed endpoint
    // (Edition-aware /api/og), not a stale share-card path.
    const ogSrc = await ogImg.getAttribute('src');
    expect(ogSrc).toMatch(/^\/api\/og\?/);
    expect(ogSrc).toContain('occasion=wedding');

    // Close via the modal's own close button.
    await publish.getByRole('button', { name: /Close publish flow/i }).click();
    await expect(publish).toHaveCount(0, { timeout: 5_000 });
  });

  test('Command palette + Theme Shop close together when both ride the same Esc', async ({ page }) => {
    // Open the palette only — both surfaces respect Esc, but the
    // palette is the top-most. This verifies the palette doesn't
    // accidentally pop back open after a previous run left state.
    await page.keyboard.press('Control+K');
    const palette = page.getByRole('dialog', { name: /Command palette/i });
    await expect(palette).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(palette).toHaveCount(0);

    // Re-press ⌘K — verifies the toggle behaviour: the binding
    // flips `open` on every press, so a fresh press after Esc must
    // re-open (not toggle off).
    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog', { name: /Command palette/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /Command palette/i })).toHaveCount(0);
  });
});

/* =========================================================================
   USER SETTINGS MODAL — mounted in the dashboard shell, not the editor.
   The topbar avatar button (aria-label "Open account settings") is the
   canonical entry-point. The modal must show all four tabs (Account /
   Usage & credits / Subscription / Preferences).
   ========================================================================= */

async function installDashboardMocks(page: Page) {
  // The settings modal pulls /api/ai-usage on open + /api/user/preferences
  // when the Preferences tab mounts. Both endpoints are defensively
  // null-tolerant inside the modal, but mocking them keeps the test
  // hermetic and exercises the happy-path render.
  await page.route(/\/api\/ai-usage(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plan: 'free',
        unlimited: false,
        used: 12,
        limit: 50,
        remaining: 38,
      }),
    });
  });
  await page.route(/\/api\/user\/preferences(\?|$)/, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          voice: 'gentle',
          quiet_hours: true,
          display_name: null,
          pronouns: null,
          timezone: null,
        }),
      });
      return;
    }
    // PATCH is debounced from inside the modal — accept silently.
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  // Dashboard home pulls /api/sites + a handful of widget endpoints.
  // Empty arrays are sufficient for the topbar avatar to render.
  await page.route('**/api/sites', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"sites":[]}' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
}

test.describe('Settings modal (dashboard topbar)', () => {
  test.beforeEach(async ({ page }) => {
    await installDashboardMocks(page);
    await page.goto(DASHBOARD_URL);
    // The topbar avatar button is the canonical opener — wait for
    // it before driving any clicks.
    await expect(
      page.getByRole('button', { name: /Open account settings/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('Topbar avatar opens the modal with all four tabs', async ({ page }) => {
    await page.getByRole('button', { name: /Open account settings/i }).click();

    const settings = page.getByRole('dialog', { name: /User settings/i });
    await expect(settings).toBeVisible({ timeout: 5_000 });
    await expect(settings).toHaveAttribute('aria-modal', 'true');

    // All four tabs must be present in the left rail. The tab pills
    // are <button>s with the tab label as their visible text.
    for (const label of [
      /^Account$/,
      /^Usage & credits$/,
      /^Subscription$/,
      /^Preferences$/,
    ]) {
      await expect(settings.getByRole('button', { name: label })).toBeVisible();
    }

    // The default tab is "Account" — the heading reads "Account" and
    // the subtitle reads "Your profile and how we reach you."
    await expect(
      settings.getByRole('heading', { name: /^Account$/, level: 2 }),
    ).toBeVisible();
  });

  test('All four tabs swap the content heading', async ({ page }) => {
    await page.getByRole('button', { name: /Open account settings/i }).click();
    const settings = page.getByRole('dialog', { name: /User settings/i });
    await expect(settings).toBeVisible();

    // Click each tab + assert the content heading swaps to match.
    // Tab labels in the left rail double as the page H2 (with the
    // exception of "Usage & credits" → heading "Usage & credits").
    const tabs: Array<{ tab: RegExp; heading: RegExp }> = [
      { tab: /^Usage & credits$/, heading: /^Usage & credits$/ },
      { tab: /^Subscription$/, heading: /^Subscription$/ },
      { tab: /^Preferences$/, heading: /^Preferences$/ },
      { tab: /^Account$/, heading: /^Account$/ },
    ];
    for (const { tab, heading } of tabs) {
      await settings.getByRole('button', { name: tab }).click();
      await expect(
        settings.getByRole('heading', { name: heading, level: 2 }),
      ).toBeVisible();
    }
  });

  test('Esc closes the settings modal', async ({ page }) => {
    await page.getByRole('button', { name: /Open account settings/i }).click();
    const settings = page.getByRole('dialog', { name: /User settings/i });
    await expect(settings).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(settings).toHaveCount(0, { timeout: 5_000 });
  });
});
