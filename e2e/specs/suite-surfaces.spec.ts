import { test, expect, type Page } from '@playwright/test';

/*
 * suite-surfaces.spec.ts — newest Suite-phase surfaces:
 *
 *   1. Share kit (SharePanel)       — three themed PNG downloads
 *   2. Toasts & speeches tool       — rail wiring + panel mount
 *   3. Schedule templates           — "Start from a template" strip
 *   4. Section-rail live signals    — real counts + attention dots
 *   5. Studio proof sheet           — overlay entry (AI-tolerant)
 *   6. /std reveal dead-link state  — branded fallback, never a 500
 *
 * NOTE TO THE FIRST RUNNER: these specs were authored pattern-
 * matched against editor-surface.spec.ts + studio.spec.ts and were
 * NOT executed in the authoring sandbox (no database there). The
 * selectors were derived by reading the components, but the first
 * local run may need small selector touch-ups.
 *
 * Real editor (tests 1-4):
 *   - The redesign editor mounts only at /editor/[siteSlug] and
 *     server-loads the manifest from the DB (no /dev mock route),
 *     so each test seeds a site through the authed
 *     POST /api/sites (same API the screenshot tour reads from),
 *     then navigates to /editor/<slug>.
 *   - The seed manifest deliberately ships NO events / gallery
 *     photos / cover photo so the schedule-template strip and the
 *     rail's empty-state signals are exercisable.
 *   - Client-side autosave POSTs to /api/sites are stubbed to 200
 *     so in-test edits never write back to the DB — every test
 *     re-seeds, so each starts from the same pristine manifest.
 *
 * Mocked studio (test 5):
 *   - Same /dashboard/invite?site=playwright-test +
 *     /api/sites/playwright-test interception studio.spec.ts uses.
 *   - /api/suite/proofs is deliberately NOT mocked: the proof
 *     sheet must settle into EITHER real proofs OR the warm error
 *     state (AI key may be absent in CI). We assert the overlay +
 *     one of the two outcomes — never a crash.
 *
 * Everything is DOM-asserted via role/text selectors; animation
 * timings are absorbed by Playwright's auto-waiting.
 */

const SUITE_SLUG = 'pw-suite-surfaces';

/* Pristine seed — wedding occasion (so the schedule strip's
   occasion-matched template is "Wedding day"), far-future date
   (keeps the GoLiveBadge out of the topbar), and crucially NO
   events / galleryImages / coverPhoto so:
     - SchedulePanel sees an untouched timeline → template strip
     - SectionRail gallery row reads "No photos yet" + dot       */
const SEED_MANIFEST = {
  occasion: 'wedding',
  themeFamily: 'v8',
  names: ['Emma', 'James'],
  logistics: {
    date: '2027-09-12',
    venue: 'The Olive Grove',
    venueAddress: '12 Lane St, Sonoma, CA',
    rsvpDeadline: '2027-08-01',
  },
  theme: { colors: { accent: '#8B9C5A' } },
  chapters: [],
  studio: {},
};

/** Seed (create or overwrite) the suite-surfaces site through the
 *  authed sites API. page.request shares the storageState cookie
 *  jar, and API-context requests are NOT intercepted by page.route
 *  — so this always reaches the real DB even after mocks install.
 *  Re-seeding per test keeps every test independent even if a
 *  stray beforeunload beacon ever leaked a write. */
async function seedEditorSite(page: Page): Promise<void> {
  const res = await page.request.post('/api/sites', {
    data: { subdomain: SUITE_SLUG, manifest: SEED_MANIFEST, names: ['Emma', 'James'] },
  });
  if (!res.ok()) {
    throw new Error(
      `Seeding ${SUITE_SLUG} via POST /api/sites failed (${res.status()}). ` +
      'Confirm global-setup signed the e2e user in, the slug is not owned ' +
      'by another account (409), and the plan gate is not capping site ' +
      'creation (402).',
    );
  }
}

/** Stub the editor's client-side autosave so in-test edits resolve
 *  instantly AND never overwrite the pristine DB seed. Mirrors
 *  installEditorMocks in editor-surface.spec.ts. The editor page
 *  itself is server-rendered from the DB, so this only intercepts
 *  the browser's own POSTs. */
async function installEditorMocks(page: Page) {
  await page.route('**/api/sites', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
      return;
    }
    await route.continue();
  });
}

test.describe('Editor tool surfaces (Share kit · Toasts · Schedule · rail signals)', () => {
  test.beforeEach(async ({ page }) => {
    await seedEditorSite(page);
    await installEditorMocks(page);
    await page.goto(`/editor/${SUITE_SLUG}`);
    // The topbar's pearl-accent "Publish" pill is the canonical
    // mount signal for the redesign editor shell.
    await expect(
      page.getByRole('button', { name: /^Publish/ }).first(),
    ).toBeVisible({ timeout: 25_000 });
    // And the left rail's Sections tab content rendered.
    await expect(page.locator('aside.pl-rd-rail-left').getByText('Page sections')).toBeVisible();
  });

  /* ── 1 · Share kit ──────────────────────────────────────────── */

  test('Share tool renders the Share kit with three size tiles', async ({ page }) => {
    const rail = page.locator('aside.pl-rd-rail-left');
    const rightRail = page.locator('aside.pl-rd-rail-right');

    // The Tools group's "Share" row mounts SharePanel via the
    // PropertyRail dispatch. Scope to the rail — the topbar also
    // has a "Share" button.
    await rail.getByText('Share', { exact: true }).click();
    await expect(rightRail.getByRole('heading', { name: 'Share' })).toBeVisible();

    // The "Share kit" group with its three pre-sized tiles. The
    // tile labels live alongside dimension sub-text, so the
    // canvas aria-label + the download button's accessible name
    // are the stable identifiers.
    await expect(rightRail.getByText('Share kit', { exact: true })).toBeVisible();
    for (const label of ['Square', 'Story', 'Banner']) {
      await expect(rightRail.getByLabel(`${label} share image preview`)).toBeVisible();
      await expect(
        rightRail.getByRole('button', { name: `Download ${label} share image` }),
      ).toBeVisible();
    }
  });

  test('Share kit download produces a .png download event', async ({ page }) => {
    const rail = page.locator('aside.pl-rd-rail-left');
    const rightRail = page.locator('aside.pl-rd-rail-right');
    await rail.getByText('Share', { exact: true }).click();

    const squareBtn = rightRail.getByRole('button', { name: 'Download Square share image' });
    await expect(squareBtn).toBeVisible();
    // The buttons stay disabled behind the "Drawing…" veil while
    // fonts load + the canvases paint; Playwright's click waits
    // for enabled, but give the font round-trip extra room.
    await expect(squareBtn).toBeEnabled({ timeout: 20_000 });

    const downloadPromise = page.waitForEvent('download');
    await squareBtn.click();
    const download = await downloadPromise;
    // downloadCanvasPng names the file `${siteSlug}-share-${id}.png`.
    expect(download.suggestedFilename()).toMatch(/\.png$/);
    expect(download.suggestedFilename()).toBe(`${SUITE_SLUG}-share-square.png`);
  });

  /* ── 2 · Toasts & speeches reachability ─────────────────────── */

  test('"Toasts & speeches" rail row mounts the panel', async ({ page }) => {
    const rail = page.locator('aside.pl-rd-rail-left');
    const rightRail = page.locator('aside.pl-rd-rail-right');

    // Guards the tool-wiring regression class: the row exists in
    // the rail's Tools group AND clicking it actually dispatches
    // a panel through PropertyRail.
    const row = rail.getByText('Toasts & speeches', { exact: true });
    await expect(row).toBeVisible();
    await row.click();

    // PropertyRail header swaps to the tool's label…
    await expect(rightRail.getByRole('heading', { name: 'Toasts & speeches' })).toBeVisible();
    // …and the panel body renders the kind selector (4 speech
    // kinds, "Vows" pre-selected) + the Pear draft CTA.
    await expect(rightRail.getByText('What are we writing?')).toBeVisible();
    for (const kind of ['Vows', 'Parent toast', 'Best-friend toast', 'Welcome speech']) {
      await expect(rightRail.getByRole('button', { name: kind, exact: true })).toBeVisible();
    }
    await expect(rightRail.getByRole('button', { name: 'Vows', exact: true }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect(rightRail.getByRole('button', { name: /Draft with Pear/ })).toBeVisible();
  });

  /* ── 3 · Schedule templates ─────────────────────────────────── */

  test('Schedule template strip seeds the timeline, then retires itself', async ({ page }) => {
    const rail = page.locator('aside.pl-rd-rail-left');
    const rightRail = page.locator('aside.pl-rd-rail-right');

    await rail.getByText('Schedule', { exact: true }).click();
    await expect(rightRail.getByRole('heading', { name: 'Schedule' })).toBeVisible();

    // Fresh site (no manifest.events) → the panel shows the
    // untouched 4-row default seed + the template strip.
    await expect(rightRail.getByText('Start from a template')).toBeVisible();
    await expect(rightRail.getByText('Timeline · 4 moments')).toBeVisible();

    // The occasion-matched template (wedding → "Wedding day")
    // sorts first with the filled-peach treatment. One tap drops
    // in the 5-moment wedding timeline.
    await rightRail.getByRole('button', { name: /Wedding day/ }).click();

    // Rows populated (count > 2): the 5 seeded moments each carry
    // a "Remove <name>" affordance.
    await expect(rightRail.getByText('Timeline · 5 moments')).toBeVisible();
    const removeButtons = rightRail.getByRole('button', { name: /^Remove / });
    expect(await removeButtons.count()).toBeGreaterThan(2);

    // The strip only shows while the schedule is pristine — after
    // the edit it disappears.
    await expect(rightRail.getByText('Start from a template')).toHaveCount(0);

    // Cross-check: the left rail's live signal flips from the
    // static desc to the real count.
    await expect(rail.getByText('5 moments')).toBeVisible();
  });

  /* ── 4 · Section-rail live signals ──────────────────────────── */

  test('rail shows real gallery state ("No photos yet") plus an attention dot', async ({ page }) => {
    const rail = page.locator('aside.pl-rd-rail-left');
    const galleryRow = rail.locator('.pl-rd-section-row').filter({ hasText: 'Gallery' });

    // The live desc derives from manifest.galleryImages — empty
    // seed → "No photos yet". The old prototype mock copy
    // ("38 photos") must never surface in the rail.
    await expect(galleryRow.getByText('No photos yet')).toBeVisible();
    await expect(rail.getByText('38 photos')).toHaveCount(0);

    // Effectively-empty sections get the quiet peach attention
    // dot, identified by its "Nothing here yet" title/aria-label.
    await expect(galleryRow.locator('[title="Nothing here yet"]')).toBeVisible();
  });
});

/* =========================================================================
   STUDIO PROOF SHEET — mounted in the stationery Studio at
   /dashboard/invite?site=playwright-test, same interception setup as
   studio.spec.ts. The proofs endpoint itself is left live so the test
   tolerates both outcomes (real proofs / warm error without an AI key).
   ========================================================================= */

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
  theme: { colors: { accent: '#8B9C5A' } },
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

test.describe('Studio proof sheet entry', () => {
  test.beforeEach(async ({ page }) => {
    await installStudioMocks(page);
    await page.goto(`/dashboard/invite?site=${TEST_SLUG}`);
    await expect(page.getByText(/Studio · /)).toBeVisible({ timeout: 20_000 });
  });

  test('proof-sheet tile opens the overlay; it settles into proofs or the warm error state', async ({ page }) => {
    // The press round-trips /api/suite/proofs which may hit a real
    // model — allow plenty of settling room.
    test.setTimeout(120_000);

    // The gradient tile sits at the top of the left DraftsRail.
    await page.getByRole('button', { name: /See the proof sheet/i }).click();

    // Overlay mounts immediately in its "pressing" phase.
    const sheet = page.getByRole('dialog', { name: /proof sheet/i });
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('aria-modal', 'true');

    // Tolerate-not-require: /api/suite/proofs is unmocked. With a
    // working AI key the header flips to "Pear pressed N proofs";
    // without one (CI) the body shows the warm role=alert error
    // with its "Press again" retry. Either is a pass — a crash or
    // a forever-spinner is the only failure.
    const ready = sheet.getByText(/Pear pressed \d+ proofs/);
    const warmError = sheet.getByRole('alert');
    await expect(ready.or(warmError).first()).toBeVisible({ timeout: 60_000 });

    if (await warmError.count()) {
      // Warm error state — retry affordance present, no raw
      // status codes leaked into the copy.
      await expect(sheet.getByRole('button', { name: /Press again/ })).toBeVisible();
    } else {
      // Ready state — at least one pickable proof tile rendered.
      expect(await sheet.getByRole('button', { name: /^Pick the / }).count()).toBeGreaterThan(0);
    }

    // Close cleanly either way.
    await sheet.getByRole('button', { name: /Close proof sheet/i }).click();
    await expect(sheet).toHaveCount(0);
  });
});

/* =========================================================================
   SAVE-THE-DATE REVEAL — /std/[siteSlug] fails soft for unknown slugs:
   the branded dead-link state, never a 500.
   ========================================================================= */

test.describe('Save-the-date reveal page', () => {
  test('dead link renders the branded not-ready state, not a 500', async ({ page }) => {
    const response = await page.goto('/std/this-does-not-exist');
    expect(response?.status() ?? 0).toBeLessThan(500);

    // The fallback uses the typographic apostrophe (&rsquo;) —
    // match either so a copy tweak doesn't flake the test.
    await expect(
      page.getByRole('heading', { name: /This link isn[’']t ready\./ }),
    ).toBeVisible();
    await expect(page.getByText('Save the date', { exact: true })).toBeVisible();
    await expect(page.getByText('Reach out to your hosts for a fresh link.')).toBeVisible();
  });
});
