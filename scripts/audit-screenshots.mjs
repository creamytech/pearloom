/**
 * Pearloom audit — screenshots every user-reachable route at
 * desktop + mobile widths for visual UX review.
 * Usage: BASE_URL=http://localhost:3000 node scripts/audit-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve(process.cwd(), '.audit/shots');

const ROUTES = [
  // ── Marketing + entry ─────────────────────────────────
  { name: '01-home',                path: '/',                       full: true },
  { name: '02-login',               path: '/login',                  full: true },
  { name: '03-templates',           path: '/templates',              full: true },
  { name: '04-marketplace',         path: '/marketplace',            full: true },
  { name: '05-partners',            path: '/partners',               full: true },
  { name: '06-privacy',             path: '/privacy',                full: true },
  { name: '07-terms',               path: '/terms',                  full: true },

  // ── Wizard (no auth path lands at login; we shoot it anyway) ──
  { name: '10-wizard-new',          path: '/wizard/new',             full: true },
  { name: '11-wizard-template',     path: '/wizard/new?template=wildflower-barn', full: true },
  { name: '12-wizard-template-dark', path: '/wizard/new?template=pearl-district', full: true },
  { name: '13-wizard-template-playful', path: '/wizard/new?template=sweet-sixteen-template', full: true },

  // ── Dashboard (requires auth — captures login redirect when unauth’d) ──
  { name: '20-dashboard',           path: '/dashboard',              full: true },
  { name: '21-day-of',              path: '/dashboard/day-of',       full: true },
  { name: '22-analytics',           path: '/dashboard/analytics',    full: true },
  { name: '23-connections',         path: '/dashboard/connections',  full: true },
  { name: '24-help',                path: '/dashboard/help',         full: true },
  { name: '25-gallery',             path: '/dashboard/gallery',      full: true },
  { name: '26-keepsakes',           path: '/dashboard/keepsakes',    full: true },
  { name: '27-library',             path: '/dashboard/library',      full: true },
  { name: '28-memory-book',         path: '/dashboard/memory-book',  full: true },
  { name: '29-passport-cards',      path: '/dashboard/passport-cards', full: true },
  { name: '30-rsvp',                path: '/dashboard/rsvp',         full: true },
  { name: '31-invite',              path: '/dashboard/invite',       full: true },
  { name: '32-bridge',              path: '/dashboard/bridge',       full: true },
  { name: '33-director',            path: '/dashboard/director',     full: true },
  { name: '34-event',               path: '/dashboard/event',        full: true },
  { name: '35-submissions',         path: '/dashboard/submissions',  full: true },
  { name: '36-remember',            path: '/dashboard/remember',     full: true },
  { name: '37-profile',             path: '/dashboard/profile',      full: true },

  // ── Public / misc ─────────────────────────────────────
  { name: '40-venue',               path: '/venue',                  full: true },
  { name: '41-seating',             path: '/seating',                full: true },
  { name: '42-registry',            path: '/registry',               full: true },
  { name: '43-photos',              path: '/photos',                 full: true },
  { name: '44-preview',             path: '/preview',                full: true },

  // ── Dev surfaces ──────────────────────────────────────
  { name: '50-dev-builder',         path: '/dev/builder',            full: false },
  { name: '51-dev-editor',          path: '/dev/editor',             full: false },
  { name: '52-dev-site',            path: '/dev/site',               full: false },
];

const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900 },
  { id: 'mobile', width: 390, height: 844 },
];

await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    'C:/Users/benja/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});
const ctx = await browser.newContext();
const page = await ctx.newPage();

const results = [];

for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const route of ROUTES) {
    const url = BASE + route.path;
    const file = path.join(OUT, `${route.name}.${vp.id}.png`);
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
      await page.evaluate(() => (document.fonts?.ready ?? Promise.resolve()).then(() => null));
      // Scroll to bottom to kick intersection observers, then back to top
      await page.evaluate(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        const h = document.documentElement.scrollHeight;
        for (let y = 0; y < h; y += 400) {
          window.scrollTo(0, y);
          await delay(80);
        }
        window.scrollTo(0, 0);
        await delay(200);
      });
      // Force all Reveal animations to end state (skip the reveal keyframe)
      await page.addStyleTag({
        content: `
          *, *::before, *::after { animation-delay: 0s !important; animation-duration: 0s !important; }
          .pl8 [style*="opacity: 0"] { opacity: 1 !important; transform: none !important; }
        `,
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: file, fullPage: route.full });
      const status = resp?.status();
      const finalUrl = page.url();
      results.push({ route: route.path, vp: vp.id, status, finalUrl, file });
      console.log(`[${vp.id}] ${route.path} → ${status} (${finalUrl}) → ${path.basename(file)}`);
    } catch (err) {
      results.push({ route: route.path, vp: vp.id, error: err.message });
      console.error(`[${vp.id}] ${route.path} FAILED: ${err.message}`);
    }
  }
}

await browser.close();
await fs.writeFile(path.join(OUT, '_manifest.json'), JSON.stringify(results, null, 2));
console.log(`Done. ${results.length} screenshots in ${OUT}`);
