/*
 * visibility-matrix.spec.ts — the visibility spine's fence (V.1).
 *
 * One state machine (lib/site-visibility.ts), four states, and this
 * matrix asserts exactly who sees what in each: draft (owner-only
 * 404 wall), public (open + indexable), link-only (open + noindex),
 * password (gate first, content after the password — and metadata
 * that says nothing personal). One site walks all four states via
 * the same APIs the product writes with.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

async function deleteSite(request: APIRequestContext, subdomain: string) {
  await request.delete(`/api/sites/${encodeURIComponent(subdomain)}`).catch(() => {});
}

const NAMES: [string, string] = ['Weft', 'Warp'];

function manifestFor(state: Record<string, unknown>) {
  return {
    occasion: 'wedding',
    names: NAMES,
    logistics: { date: '2027-10-09', venue: 'Matrix Hall' },
    theme: { colors: { accent: '#7a8b5c' } },
    ...state,
  };
}

test.describe('the visibility matrix', () => {
  test('one site, four states, exactly who sees what', async ({ request, browser }) => {
    test.setTimeout(240_000);
    const stamp = Date.now().toString(36);
    const slug = `fence-vis-${stamp}`;

    const created = await request.post('/api/sites', {
      data: {
        create: true,
        pressKey: `vis-key-${stamp}-abcdef12`,
        subdomain: slug,
        names: NAMES,
        manifest: manifestFor({}),
      },
    });
    expect(created.ok()).toBeTruthy();
    const finalSlug = (await created.json()).subdomain as string;

    const setState = async (state: Record<string, unknown>) => {
      const res = await request.post('/api/sites', {
        data: { subdomain: finalSlug, names: NAMES, manifest: manifestFor(state) },
      });
      expect(res.ok()).toBeTruthy();
    };

    const anonContext = () => browser.newContext({ storageState: { cookies: [], origins: [] } });

    try {
      // ── draft — the unpressed site does not exist for guests ──
      {
        const anon = await anonContext();
        const page = await anon.newPage();
        await page.goto(`/sites/${finalSlug}`, { waitUntil: 'domcontentloaded' });
        await expect
          .poll(async () => page.evaluate(() => document.body.innerText.toLowerCase()), { timeout: 20_000 })
          .toContain('site not found');
        expect(await page.evaluate(() => document.body.innerText)).not.toContain('Matrix Hall');
        await anon.close();
        // The owner previews it seamlessly.
        const owner = await request.get(`/sites/${finalSlug}`);
        expect(owner.status()).toBe(200);
        expect(await owner.text()).toContain('Matrix Hall');
      }

      const publishedBase = {
        published: true,
        publishedAt: new Date().toISOString(),
      };

      // ── public — open, and search engines are welcome ─────────
      {
        await setState({ ...publishedBase, visibility: 'public' });
        const anon = await anonContext();
        const page = await anon.newPage();
        await page.goto(`/sites/${finalSlug}`, { waitUntil: 'domcontentloaded' });
        await expect
          .poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20_000 })
          .toContain('Matrix Hall');
        const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
        expect(robots ?? 'index').not.toContain('noindex');
        await anon.close();
      }

      // ── link-only — open for the link, hidden from search ─────
      {
        await setState({ ...publishedBase, visibility: 'link-only' });
        const anon = await anonContext();
        const page = await anon.newPage();
        await page.goto(`/sites/${finalSlug}`, { waitUntil: 'domcontentloaded' });
        await expect
          .poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20_000 })
          .toContain('Matrix Hall');
        const robots = await page.locator('meta[name="robots"]').getAttribute('content');
        expect(robots ?? '').toContain('noindex');
        await anon.close();
      }

      // ── password — the gate first, the content after ──────────
      {
        await setState({
          ...publishedBase,
          visibility: 'password',
          privacyGate: { password: 'pearl-thread' },
        });
        const anon = await anonContext();
        const page = await anon.newPage();
        await page.goto(`/sites/${finalSlug}`, { waitUntil: 'domcontentloaded' });

        // The gate is what renders — none of the site's content is
        // in the visible DOM (SiteGate replaces the whole tree).
        // (exact:true — the <title> is "A private celebration ·
        // Pearloom" too, which is itself the metadata half working.)
        await expect(page.getByText('A private celebration', { exact: true })).toBeVisible({ timeout: 20_000 });
        expect(await page.evaluate(() => document.body.innerText)).not.toContain('Matrix Hall');
        // Metadata says nothing personal — no names, no venue.
        expect(await page.title()).not.toContain('Weft');
        const robots = await page.locator('meta[name="robots"]').getAttribute('content');
        expect(robots ?? '').toContain('noindex');

        // A wrong password stays outside.
        await page.locator('input[type="password"]').fill('wrong-guess');
        await page.keyboard.press('Enter');
        expect(await page.evaluate(() => document.body.innerText)).not.toContain('Matrix Hall');

        // The right password comes in.
        await page.locator('input[type="password"]').fill('pearl-thread');
        await page.keyboard.press('Enter');
        await expect
          .poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20_000 })
          .toContain('Matrix Hall');
        await anon.close();
      }

      // ── pulled back — explicit draft on a pressed site 404s ───
      {
        await setState({ ...publishedBase, visibility: 'draft' });
        const anon = await anonContext();
        const page = await anon.newPage();
        await page.goto(`/sites/${finalSlug}`, { waitUntil: 'domcontentloaded' });
        await expect
          .poll(async () => page.evaluate(() => document.body.innerText.toLowerCase()), { timeout: 20_000 })
          .toContain('site not found');
        await anon.close();
      }
    } finally {
      await deleteSite(request, finalSlug);
    }
  });

  test('a pressed bachelorette defaults to link-only without any explicit choice (V.2/L32)', async ({ request, browser }) => {
    test.setTimeout(120_000);
    const stamp = Date.now().toString(36);
    const slug = `fence-bach-${stamp}`;

    // Press + publish WITHOUT a visibility stamp — the resolver's
    // occasion fallback is what's under test (pre-spine manifests).
    const created = await request.post('/api/sites', {
      data: {
        create: true,
        pressKey: `bach-key-${stamp}-abcdef12`,
        subdomain: slug,
        names: ['Nora', ''] as [string, string],
        manifest: {
          occasion: 'bachelorette-party',
          names: ['Nora', ''],
          logistics: { date: '2027-06-12', venue: 'Casita Azul' },
          published: true,
          publishedAt: new Date().toISOString(),
        },
      },
    });
    expect(created.ok()).toBeTruthy();
    const finalSlug = (await created.json()).subdomain as string;

    try {
      const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await anon.newPage();
      await page.goto(`/sites/${finalSlug}`, { waitUntil: 'domcontentloaded' });
      // Guests with the link get in…
      await expect
        .poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20_000 })
        .toContain('Casita Azul');
      // …search engines don't.
      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      expect(robots ?? '').toContain('noindex');
      await anon.close();
    } finally {
      await deleteSite(request, finalSlug);
    }
  });
});

test.describe('the staged-editing model (C.2)', () => {
  test('a staged site serves the snapshot; the draft never leaks; Update releases it', async ({ request, browser }) => {
    test.setTimeout(180_000);
    const stamp = Date.now().toString(36);
    const slug = `fence-staged-${stamp}`;
    const base = (tagline: string) => ({
      occasion: 'wedding',
      names: ['Ana', 'Ben'],
      logistics: { date: '2027-06-12', venue: 'Staged Hall' },
      tagline,
      published: true,
      publishedAt: new Date().toISOString(),
      visibility: 'public',
      editMode: 'staged',
    });

    const created = await request.post('/api/sites', {
      data: { create: true, pressKey: `stg-${stamp}-abcdef12`, subdomain: slug, names: ['Ana', 'Ben'], manifest: base('the first pressing') },
    });
    expect(created.ok()).toBeTruthy();
    const finalSlug = (await created.json()).subdomain as string;

    try {
      // Publish v1 (stamps the snapshot), then autosave a private edit.
      expect((await request.post('/api/sites/publish', {
        data: { subdomain: finalSlug, names: ['Ana', 'Ben'], manifest: base('the first pressing') },
      })).ok()).toBeTruthy();
      expect((await request.post('/api/sites', {
        data: { subdomain: finalSlug, names: ['Ana', 'Ben'], manifest: base('EDITED IN PRIVATE') },
      })).ok()).toBeTruthy();

      const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await anon.newPage();
      await page.goto(`/sites/${finalSlug}`, { waitUntil: 'domcontentloaded' });
      await expect
        .poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20_000 })
        .toContain('the first pressing');
      expect(await page.evaluate(() => document.body.innerText)).not.toContain('EDITED IN PRIVATE');

      // "Update site" releases the draft.
      expect((await request.post('/api/sites/publish', {
        data: { subdomain: finalSlug, names: ['Ana', 'Ben'], manifest: base('EDITED IN PRIVATE') },
      })).ok()).toBeTruthy();
      await page.goto(`/sites/${finalSlug}`, { waitUntil: 'domcontentloaded' });
      await expect
        .poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20_000 })
        .toContain('EDITED IN PRIVATE');
      await anon.close();
    } finally {
      await deleteSite(request, finalSlug);
    }
  });
});
