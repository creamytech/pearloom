import { test, expect, type Page, type Request } from '@playwright/test';

/*
 * Dashboard functional-integrity regressions — coverage for the
 * "control wired to nothing" class of bug (see the /store Apply
 * fix this sweep followed). Two contracts under test, both found
 * broken in the 2026-07-02 dashboard sweep:
 *
 *   1. /dashboard/connections — Link/Unlink/Create celebration
 *      used to PATCH /api/celebrations with the site's UUID, but
 *      the route resolves `siteId` via `.eq('subdomain', …)`, so
 *      every write 404'd silently. The client must send the
 *      site's DOMAIN (subdomain), matching the WizardV8 caller.
 *
 *   2. /dashboard/submissions — toast claims live in
 *      toast_signups; the tribute moderation PATCH can't touch
 *      them. The card must expose the "Reopen slot" control wired
 *      to DELETE /api/event-os/toasts/moderation?id=… (the
 *      endpoint existed with no caller).
 *
 * Both hermetic: every /api call the pages make is mocked.
 */

const SITE_UUID = '9c3f2a1e-0000-4000-8000-e2e0c0ffee00';
const SITE_DOMAIN = 'rosa-and-milo';

const SITES_PAYLOAD = {
  sites: [
    {
      id: SITE_UUID,
      domain: SITE_DOMAIN,
      names: ['Rosa', 'Milo'],
      occasion: 'wedding',
      manifest: { occasion: 'wedding', logistics: {} },
      published: true,
      updated_at: '2026-07-01T10:00:00Z',
      created_at: '2026-06-01T10:00:00Z',
    },
  ],
};

async function mockDashChrome(page: Page) {
  // First-run orientation tour intercepts pointer events — mark it
  // done up front, same as a returning host's device.
  await page.addInitScript(() => {
    window.localStorage.setItem('pl-orientation-done', '1');
  });
  // Shell chrome fetches that aren't under test — answer quietly.
  await page.route('**/api/dashboard/notifications**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"notifications":[]}' }));
  await page.route('**/api/user/preferences**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/co-host/invitations**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"invitations":[]}' }));
}

test.describe('dashboard integrity regressions', () => {
  test('connections: celebration PATCH sends the site domain, not the uuid', async ({ page }) => {
    await mockDashChrome(page);
    await page.route('**/api/sites', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SITES_PAYLOAD) }));

    let patchBody: { siteId?: string; celebration?: { name?: string } } | null = null;
    await page.route('**/api/celebrations', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchBody = route.request().postDataJSON() as typeof patchBody;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, celebration: { id: 'celeb-1', name: patchBody?.celebration?.name ?? '' } }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });

    await page.goto('/dashboard/connections');

    // The single unlinked site card → open the link flow.
    await page.getByRole('button', { name: 'Link →' }).click();

    // No existing celebrations in the fixture → start a new one.
    const patchSent = page.waitForRequest(
      (req: Request) => req.url().includes('/api/celebrations') && req.method() === 'PATCH',
    );
    await page.getByPlaceholder(/^e\.g\./).fill('Rosa & Milo, all weekend');
    await page.keyboard.press('Enter');
    await patchSent;

    expect(patchBody).not.toBeNull();
    // The route looks sites up by subdomain — a UUID here 404s.
    expect(patchBody!.siteId).toBe(SITE_DOMAIN);
    expect(patchBody!.siteId).not.toBe(SITE_UUID);
    expect(patchBody!.celebration?.name).toBe('Rosa & Milo, all weekend');
  });

  test('submissions: toast claim card exposes Reopen slot wired to the void DELETE', async ({ page }) => {
    await mockDashChrome(page);
    await page.route('**/api/sites', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SITES_PAYLOAD) }));
    await page.route('**/api/event-os/submissions/moderation**', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"entries":[]}' }));
    await page.route('**/api/guestbook**', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"wishes":[]}' }));

    let voidedId: string | null = null;
    await page.route('**/api/event-os/toasts/moderation**', async (route) => {
      const req = route.request();
      if (req.method() === 'DELETE') {
        voidedId = new URL(req.url()).searchParams.get('id');
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"stored":true}' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          claims: [{
            id: 'claim-42',
            blockId: 'toastSignup-1',
            slotIndex: 2,
            claimedBy: 'Aunt Prue',
            at: new Date().toISOString(),
          }],
        }),
      });
    });

    await page.goto(`/dashboard/submissions?site=${SITE_DOMAIN}`);

    // The claim renders with its slot number (slotIndex 2 → slot 3)…
    await expect(page.getByText('Claimed toast slot 3')).toBeVisible();

    // …and the void control fires the DELETE with the claim id.
    const deleteSent = page.waitForRequest(
      (req: Request) => req.url().includes('/api/event-os/toasts/moderation') && req.method() === 'DELETE',
    );
    await page.getByRole('button', { name: 'Reopen slot' }).click();
    await deleteSent;

    expect(voidedId).toBe('claim-42');
    // Optimistic removal: the card leaves the feed.
    await expect(page.getByText('Claimed toast slot 3')).toHaveCount(0);
  });
});
