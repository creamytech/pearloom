import { defineConfig, devices } from '@playwright/test';

// Pearloom e2e config.
// Two suites coexist here:
//   1. studio-chromium  — auth'd editor smoke (testDir e2e/specs).
//      Requires PEARLOOM_E2E=1 + NODE_ENV=development on the dev
//      server so the e2e CredentialsProvider in src/lib/auth.ts is
//      registered. global-setup signs in once and writes the shared
//      storageState every studio spec consumes.
//   2. theme-packs-visual — public visual-regression sweep over the
//      58 Theme-Store packs (testDir tests/e2e). No auth needed —
//      renders the dev-only `/_test/theme-pack/[id]` route which
//      404s in production. Baselines under
//      tests/e2e/__screenshots__/. First run seeds; subsequent
//      runs diff. Update with `--update-snapshots`.

const PORT = Number(process.env.PEARLOOM_E2E_PORT ?? 3001);
const HOST = `http://localhost:${PORT}`;

export default defineConfig({
  // Both suites share the same dev server (it serves the public
  // visual route + the auth'd editor); per-project `testDir`
  // selects which suite a given project runs.
  outputDir: './e2e/.test-results',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    // Tight tolerance for the visual suite — a pack regression
    // typically swings palette hex values by tens of points, so
    // 0.2% catches real drift while ignoring sub-pixel AA noise.
    // Studio specs that don't call toHaveScreenshot are unaffected.
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' },
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],

  use: {
    baseURL: HOST,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  globalSetup: './e2e/global-setup.ts',

  // Boot Next dev with the e2e auth provider gated on. The
  // setup uses our custom credentials provider — no Google
  // OAuth round-trip required. The visual project reuses the
  // same dev server (it hits a public dev-only route).
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
      testDir: './e2e/specs',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        // Studio specs sign in via global-setup.
        storageState: 'e2e/.auth/user.json',
      },
    },
    {
      // Visual-regression sweep over all 58 Theme-Store packs. Public
      // surfaces only — no auth, no storageState, fixed 1280x800
      // viewport, deterministic per-pack snapshot file names so PRs
      // that regress a pack's palette/motif/divider/kit get caught.
      name: 'theme-packs-visual',
      testDir: './tests/e2e',
      // Snapshots live alongside the spec under
      // tests/e2e/__screenshots__/<spec>/<arg><ext> for easy review.
      snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        // Explicit empty storage so the dev-server's logged-in
        // cookie from a previous studio run doesn't leak in.
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
});
