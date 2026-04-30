import { defineConfig, devices } from '@playwright/test';

// Pearloom e2e config.
// Requires PEARLOOM_E2E=1 + NODE_ENV=development on the dev
// server so the e2e CredentialsProvider in src/lib/auth.ts is
// registered. The global setup signs in once and writes the
// shared storageState that every spec consumes.

const PORT = Number(process.env.PEARLOOM_E2E_PORT ?? 3001);
const HOST = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e/specs',
  outputDir: './e2e/.test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],

  use: {
    baseURL: HOST,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    storageState: 'e2e/.auth/user.json',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  globalSetup: './e2e/global-setup.ts',

  // Boot Next dev with the e2e auth provider gated on. The
  // setup uses our custom credentials provider — no Google
  // OAuth round-trip required.
  webServer: {
    command: `cross-env PEARLOOM_E2E=1 NODE_ENV=development next dev -p ${PORT}`,
    url: HOST,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PEARLOOM_E2E: '1',
      E2E_TEST_USER_EMAIL: process.env.E2E_TEST_USER_EMAIL ?? 'e2e@pearloom.test',
      E2E_TEST_USER_PASSWORD: process.env.E2E_TEST_USER_PASSWORD ?? 'pearloom-e2e-secret',
      NEXTAUTH_URL: HOST,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'pearloom-e2e-nextauth-secret',
    },
  },

  projects: [
    {
      name: 'studio-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
