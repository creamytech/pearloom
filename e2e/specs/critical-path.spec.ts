import { test, expect, type Page } from '@playwright/test';

/*
 * Critical-path e2e — the flows a broken deploy must never ship.
 * Hermetic: every /api call is mocked, so these run in CI without a
 * backend (the reviews' "ruthless coverage of the critical path"
 * item; staging fills in the true end-to-end later).
 *
 * Covered here:
 *   1. Account deletion — the DESTRUCTIVE path. The DELETE must not
 *      fire until the host retypes their exact email; a mismatch
 *      keeps the button inert. This is the single most dangerous
 *      button in the product.
 *
 * Auth: the shared storageState from global-setup (the e2e
 * CredentialsProvider) — these run in the studio-chromium /
 * critical-path project which carries the signed-in cookie jar.
 */

const EMAIL = process.env.E2E_TEST_USER_EMAIL ?? 'e2e@pearloom.test';

// The settings page's own chrome fetches — answer quietly so the
// page reaches its Danger-zone section without network noise.
async function mockSettingsChrome(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('pl-orientation-done', '1');
  });
  const empty = (body: string) => ({ status: 200, contentType: 'application/json', body });
  await page.route('**/api/dashboard/notifications**', (r) => r.fulfill(empty('{"notifications":[]}')));
  await page.route('**/api/user/preferences**', (r) => r.fulfill(empty('{}')));
  await page.route('**/api/co-host/invitations**', (r) => r.fulfill(empty('{"invitations":[]}')));
  await page.route('**/api/sites', (r) => r.fulfill(empty('{"sites":[]}')));
  await page.route('**/api/dashboard/sites-stats**', (r) => r.fulfill(empty('{}')));
  await page.route('**/api/store/entitlements**', (r) => r.fulfill(empty('{"ownedPackIds":[]}')));
}

test.describe('critical path — account deletion is a guarded destructive action', () => {
  test('the DELETE never fires until the exact email is retyped', async ({ page }) => {
    await mockSettingsChrome(page);

    // Track whether the destructive endpoint is ever called, and
    // with what confirmation payload.
    let deleteCalls = 0;
    let lastConfirmEmail: string | null = null;
    await page.route('**/api/user/delete-account', async (route) => {
      deleteCalls += 1;
      lastConfirmEmail = (route.request().postDataJSON() as { confirmEmail?: string })?.confirmEmail ?? null;
      // Don't actually tear anything down — acknowledge and stop.
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });

    // The Danger-zone group is its own settings section (the privacy
    // page deep-links here for GDPR delete).
    await page.goto('/dashboard/profile?section=danger');

    // Open the confirm dialog.
    await page.getByRole('button', { name: 'Begin delete' }).click();
    const dialog = page.getByRole('dialog', { name: /Delete your account/i });
    await expect(dialog).toBeVisible();

    const confirmButton = page.getByRole('button', { name: 'Delete everything' });
    await expect(confirmButton).toBeDisabled();

    // A WRONG email keeps the button inert — clicking must not fire.
    const emailField = dialog.getByPlaceholder(EMAIL);
    await emailField.fill('not-my-email@example.com');
    await expect(confirmButton).toBeDisabled();
    expect(deleteCalls).toBe(0);

    // The EXACT email arms it (case-insensitively, per the gate).
    await emailField.fill(EMAIL.toUpperCase());
    await expect(confirmButton).toBeEnabled();

    // Now the DELETE fires exactly once, carrying the typed email.
    const deleteSent = page.waitForRequest(
      (req) => req.url().includes('/api/user/delete-account') && req.method() === 'POST',
    );
    await confirmButton.click();
    await deleteSent;

    expect(deleteCalls).toBe(1);
    expect((lastConfirmEmail ?? '').toLowerCase()).toBe(EMAIL.toLowerCase());
  });

  test('cancelling the dialog never touches the endpoint', async ({ page }) => {
    await mockSettingsChrome(page);
    let deleteCalls = 0;
    await page.route('**/api/user/delete-account', async (route) => {
      deleteCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });

    await page.goto('/dashboard/profile?section=danger');
    await page.getByRole('button', { name: 'Begin delete' }).click();
    await expect(page.getByRole('dialog', { name: /Delete your account/i })).toBeVisible();

    // Fully arm it, then back out — the endpoint must stay untouched.
    await page.getByPlaceholder(EMAIL).fill(EMAIL);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog', { name: /Delete your account/i })).toBeHidden();
    expect(deleteCalls).toBe(0);
  });
});
