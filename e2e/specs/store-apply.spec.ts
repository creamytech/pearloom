import { test, expect, type Page, type Request } from '@playwright/test';

/*
 * /store → editor "Apply" hand-off — regression coverage for the
 * bug where picking a free pack in the Theme Store and pressing
 * Apply navigated to the editor but the site kept its old theme.
 *
 * The contract under test:
 *
 *   1. STORE SIDE (ThemeStore.tsx): Apply on an owned/free pack
 *      stashes `{ id, at }` under localStorage 'pl-applied-pack'
 *      and navigates to /editor/{slug} (single-site fast path).
 *
 *   2. EDITOR SIDE (EditorRedesign.tsx): the mount consumer reads
 *      + clears the stash, stamps the pack via applyPackToManifest
 *      through the bridge's normal setManifest path, fires the
 *      undoable toast, and the AUTOSAVE POST /api/sites carries
 *      the pack's themeId / themeVars / appliedPackId.
 *
 * Uses the free pack 'sage-watercolor' (accent #7E8F6E, kit
 * classic, texture watercolor). The editor leg runs against
 * /dev/editor (EditorRedesign on the reference-manifest fixture,
 * dev-gated, no DB) so the test stays hermetic; /api/sites is
 * mocked on both legs.
 */

const PACK_ID = 'sage-watercolor';
const PACK_NAME = 'Sage Watercolor';
const PACK_ACCENT = '#7E8F6E';
const STASH_KEY = 'pl-applied-pack';

test.describe('Theme Store → editor pack hand-off', () => {
  test('editor consumes the stash and the autosave POST carries the pack look', async ({ page }) => {
    // Seed the stash exactly as ThemeStore.stashPackForEditor writes it.
    await page.addInitScript(
      ([key, id]) => {
        window.localStorage.setItem(key, JSON.stringify({ id, at: Date.now() }));
      },
      [STASH_KEY, PACK_ID],
    );

    // Answer autosave POSTs with 200 so the save pill settles.
    await page.route('**/api/sites', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"sites":[]}' });
    });

    // Match the autosave POST that carries the pack (the predicate
    // inspects the body so an unrelated earlier save can't steal
    // the wait).
    const savePost = page.waitForRequest(
      (req: Request) => {
        if (!req.url().includes('/api/sites') || req.method() !== 'POST') return false;
        try {
          const b = req.postDataJSON() as { manifest?: { themeId?: string } } | null;
          return b?.manifest?.themeId === PACK_ID;
        } catch {
          return false;
        }
      },
      { timeout: 45_000 },
    );

    await page.goto('/dev/editor');

    // The canvas visibly wears the pack: ThemedSite emits the full
    // themeVars bag on the .pl8-guest root's style attribute, so the
    // pack's accent landing there proves the apply reached the live
    // manifest. (The undoable toast also fires, but its 6s auto-
    // dismiss races dev-mode first-compile load times — the style
    // assertion is the deterministic signal.)
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const el = document.querySelector('.pl8-guest') as HTMLElement | null;
            return el?.style.getPropertyValue('--t-accent').trim() || null;
          }),
        { timeout: 30_000 },
      )
      .toBe(PACK_ACCENT);

    // The stash is one-shot — consumed on mount, never re-applied.
    await expect
      .poll(async () => page.evaluate((k) => window.localStorage.getItem(k), STASH_KEY))
      .toBeNull();

    // The autosave (2s debounce) must persist the pack onto the
    // manifest — this is the half that was missing: previously the
    // stash was written and never read, so no save ever carried it.
    const saveReq = await savePost;
    const body = saveReq.postDataJSON() as Record<string, unknown>;
    expect(body.subdomain).toBe('dev-editor');
    const manifest = body.manifest as {
      themeId?: string;
      appliedPackId?: string;
      themeVars?: Record<string, string>;
      kitId?: string;
      texture?: string;
      theme?: { colors?: { accent?: string } };
    };
    expect(manifest.themeId).toBe(PACK_ID);
    expect(manifest.appliedPackId).toBe(PACK_ID);
    expect(manifest.themeVars?.['--t-accent']).toBe(PACK_ACCENT);
    expect(manifest.theme?.colors?.accent).toBe(PACK_ACCENT);
    expect(manifest.kitId).toBe('classic');
    expect(manifest.texture).toBe('watercolor');
  });

  test('store Apply stashes the pack and routes to the owned site’s editor', async ({ page }) => {
    // One owned site → Apply takes the no-prompt fast path.
    await page.route('**/api/sites', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sites: [{ subdomain: 'demo-site', ai_manifest: { names: ['Avery', 'Wren'] } }],
          }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    // Deterministic entitlements (free packs are implicitly owned).
    await page.route('**/api/store/entitlements**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"packIds":[]}' });
    });
    // The editor route needs a real DB row — stub the destination;
    // this leg only asserts the hand-off, the editor leg above
    // asserts consumption.
    await page.route('**/editor/demo-site**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><head><title>editor stub</title></head><body>editor stub</body></html>',
      });
    });

    await page.goto('/store');

    // Find the free pack's card via search; free packs surface the
    // "Apply" CTA directly (implicit ownership).
    await page.getByLabel('Search packs').fill(PACK_NAME);
    const card = page.locator('.pl-store-card', { hasText: PACK_NAME });
    await expect(card).toHaveCount(1, { timeout: 15_000 });
    await card.getByRole('button', { name: 'Apply' }).click();

    // Toast names the pack + the target site.
    await expect(
      page.getByText(`Applying ${PACK_NAME} to Avery & Wren…`),
    ).toBeVisible({ timeout: 10_000 });

    // The stash is written with the current payload shape.
    const raw = await page.evaluate((k) => window.localStorage.getItem(k), STASH_KEY);
    expect(raw).not.toBeNull();
    const stash = JSON.parse(raw!) as { id?: string; at?: number };
    expect(stash.id).toBe(PACK_ID);
    expect(typeof stash.at).toBe('number');

    // …and the store routes to that site's editor.
    await page.waitForURL('**/editor/demo-site**', { timeout: 15_000 });
  });
});
