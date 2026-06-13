import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import { mkdirSync } from 'fs';

// Global setup — sign in once via the e2e CredentialsProvider,
// save the cookie jar to e2e/.auth/user.json. Every spec then
// reuses that storageState so we don't pay the auth cost on
// each test.
//
// The provider lives in src/lib/auth.ts behind a PEARLOOM_E2E
// env gate; if that gate is off, the request 401s here and we
// fail loudly with a hint.

const STORAGE_PATH = path.join(__dirname, '.auth', 'user.json');

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://127.0.0.1:3001';
  const email = process.env.E2E_TEST_USER_EMAIL ?? 'e2e@pearloom.test';
  const password = process.env.E2E_TEST_USER_PASSWORD ?? 'pearloom-e2e-secret';

  mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // 1) Pull the CSRF token NextAuth requires for credentials POSTs.
  const csrfRes = await page.request.get(`${baseURL}/api/auth/csrf`);
  if (!csrfRes.ok()) {
    await browser.close();
    throw new Error(`Failed to fetch CSRF token (${csrfRes.status()}). Is the dev server up?`);
  }
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  // 2) POST to the e2e credentials callback. NextAuth returns a
  //    redirect with a set-cookie that the page.context picks up.
  const signinRes = await page.request.post(`${baseURL}/api/auth/callback/e2e`, {
    form: {
      csrfToken,
      email,
      password,
      json: 'true',
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  if (!signinRes.ok()) {
    await browser.close();
    throw new Error(
      `e2e sign-in failed (${signinRes.status()}). ` +
      'Confirm the dev server was started with PEARLOOM_E2E=1 and that ' +
      'E2E_TEST_USER_EMAIL/E2E_TEST_USER_PASSWORD match playwright.config.ts.',
    );
  }

  // 3) Hit a known authenticated route to verify the session
  //    cookie is honoured by middleware before we save state.
  await page.goto(`${baseURL}/dashboard`);
  // The dashboard either renders or redirects to /login when
  // auth fails. If we land on /login the storageState is bad;
  // surface that loudly.
  if (/\/login(\?|$)/.test(page.url())) {
    await browser.close();
    throw new Error('e2e auth verified but middleware bounced us to /login. Check NEXTAUTH_SECRET parity.');
  }

  await ctx.storageState({ path: STORAGE_PATH });
  await browser.close();
}
