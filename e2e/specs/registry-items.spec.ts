import { test, expect, type Page } from '@playwright/test';

/*
 * Registry items — panel → canvas round trip.
 *
 * Regression coverage for the bug where the editor canvas kept
 * showing the DEMO registry cards no matter what the host added in
 * the RegistryPanel's Items manager — their real items never
 * surfaced.
 *
 * The contract under test:
 *
 *   1. CANVAS (RegistryItemsGrid via ThemedSite's registrySiteSlug):
 *      the editor canvas fetches the host's REAL items through the
 *      same public GET the published grid uses; demo furniture is
 *      the empty state ONLY (honesty rule: demo gated by `editable`).
 *
 *   2. PANEL (RegistryPanel's RegistryItemsGroup): add / delete
 *      writes through /api/registry-items and pings
 *      pearloom:registry-items so the canvas refetches promptly.
 *
 * Runs against /dev/editor (EditorRedesign on the reference-manifest
 * fixture, dev-gated, no DB) with a stateful /api/registry-items
 * mock so the test stays hermetic.
 */

const EDITOR_URL = '/dev/editor';
// Unique demo-card copy (RegistryItemsGrid DEMO_ITEMS) — "The dutch
// oven" also appears in the panel's placeholder, so assert on this.
const DEMO_CARD = 'A case of the good olive oil';
const REAL_ITEM = 'The copper kettle';

async function installMocks(page: Page, items: Array<Record<string, unknown>>) {
  // Autosave — settle the save pill immediately.
  await page.route('**/api/sites', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"sites":[]}' });
  });

  // Stateful registry-items store — GET lists, POST appends,
  // DELETE removes. Both the panel (owner view) and the canvas
  // grid (public view) hit this same endpoint.
  let nextId = 1;
  await page.route('**/api/registry-items?*', async (route) => {
    const req = route.request();
    const method = req.method();
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items }) });
      return;
    }
    if (method === 'DELETE') {
      const id = new URL(req.url()).searchParams.get('id');
      const idx = items.findIndex((it) => it.id === id);
      if (idx >= 0) items.splice(idx, 1);
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    await route.continue();
  });
  await page.route('**/api/registry-items', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = req.postDataJSON() as Record<string, unknown>;
      const item = {
        id: `item-${nextId++}`,
        name: body.name,
        description: body.description ?? null,
        price: body.price ?? null,
        imageUrl: body.imageUrl ?? null,
        itemUrl: body.itemUrl ?? null,
        quantity: body.quantity ?? 1,
        quantityClaimed: 0,
        purchased: false,
        claimedByFirstName: null,
        allowGroupGift: body.allowGroupGift === true,
      };
      items.push(item);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ item }) });
      return;
    }
    await route.continue();
  });
}

test.describe('Registry items — panel → canvas', () => {
  test('host items replace the demo cards; delete brings demo back', async ({ page }) => {
    const items: Array<Record<string, unknown>> = [];
    await installMocks(page, items);
    await page.goto(EDITOR_URL);
    // Mount checkpoint — the canvas site root is the part of the
    // editor this spec exercises.
    const canvas = page.locator('.pl8-guest').first();
    await expect(canvas).toBeVisible({ timeout: 25_000 });

    // Zero items → the canvas registry section wears the demo
    // furniture (the honest empty state).
    await expect(canvas.getByText(DEMO_CARD)).toBeVisible({ timeout: 15_000 });

    // Open the Registry panel from the section rail.
    await page.locator('.pl-rd-rail-left').getByText('Registry', { exact: true }).click();

    // Add an item through the Items manager.
    await page.getByRole('button', { name: 'Add an item' }).click();
    await page.getByPlaceholder('Item name (e.g. The dutch oven)').fill(REAL_ITEM);
    await page.getByPlaceholder('Price (USD)').fill('90');
    await page.getByRole('button', { name: 'Set it' }).click();

    // The canvas grid refetches (pearloom:registry-items ping) and
    // shows the HOST'S item — demo cards gone.
    await expect(canvas.getByText(REAL_ITEM)).toBeVisible({ timeout: 15_000 });
    await expect(canvas.getByText(DEMO_CARD)).toHaveCount(0);

    // Delete the last item → the demo furniture returns.
    await page.getByRole('button', { name: `Remove ${REAL_ITEM}` }).click();
    await expect(canvas.getByText(DEMO_CARD)).toBeVisible({ timeout: 15_000 });
    await expect(canvas.getByText(REAL_ITEM)).toHaveCount(0);
  });
});
