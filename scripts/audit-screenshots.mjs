/**
 * Pearloom v8 audit — screenshots every key route at desktop + mobile widths.
 * Usage: node scripts/audit-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve(process.cwd(), '.audit/shots');

const ROUTES = [
  { name: '01-home', path: '/', full: true },
  { name: '02-login', path: '/login', full: true },
  { name: '03-templates', path: '/templates', full: true },
  { name: '04-wizard', path: '/wizard/new', full: true },
  { name: '05-dashboard', path: '/dashboard', full: true },
  { name: '06-day-of', path: '/dashboard/day-of', full: true },
  { name: '07-builder', path: '/dev/builder', full: false },
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
const ctx = await browser.newContext({
  // Skip auth redirect by pretending we don't have a session — marketing
  // pages render; /dashboard will redirect to /login if no session cookie,
  // which is the real guest-visitor path and useful to audit on its own.
});
const page = await ctx.newPage();

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
      console.log(`[${vp.id}] ${route.path} → ${resp?.status()} → ${file}`);
    } catch (err) {
      console.error(`[${vp.id}] ${route.path} FAILED: ${err.message}`);
    }
  }
}

await browser.close();
console.log('Done. Screenshots in', OUT);
