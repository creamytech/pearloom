/**
 * Kit × layout-variant sweep on the published renderer (/dev/site).
 * For each kit + variant combo, loads /dev/site, screenshots each
 * section element. Batches: one page load sets one variant per
 * section (cycling), so ~5 loads per kit cover every variant.
 *
 * Usage:
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/kit-variant-sweep.mjs [outDir] [--width=1440] [--only=kit:section:variant,...]
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.audit/kit-sweep');
const widthArg = process.argv.find((a) => a.startsWith('--width='));
const WIDTH = widthArg ? Number(widthArg.split('=')[1]) : 1440;
const HEIGHT = WIDTH < 800 ? 844 : 900;
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.split('=')[1].split(',')) : null;

const SECTIONS = {
  schedule: ['cards', 'timeline', 'stepper', 'numbered'],
  details: ['tiles', 'iconrow', 'accordion', 'bento', 'ledger'],
  travel: ['map', 'rows', 'table', 'carousel'],
  registry: ['cards', 'chips', 'progress', 'storecards'],
  gallery: ['grid', 'masonry', 'slideshow', 'polaroid', 'frames'],
  rsvp: ['centered', 'split', 'banner', 'minimal'],
  faq: ['accordion', 'twocol', 'numbered', 'cards'],
};
const KITS = ['classic', 'ticket', 'plate', 'scrapbook', 'index', 'minimal'];
const MAX_V = Math.max(...Object.values(SECTIONS).map((v) => v.length));

await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
await ctx.addInitScript(() => {
  try { window.localStorage.setItem('pl:arrival-seen:demo', '1'); } catch {}
});
const page = await ctx.newPage();

async function settle() {
  await page.evaluate(() => (document.fonts?.ready ?? Promise.resolve()).then(() => null));
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await delay(40); }
    window.scrollTo(0, 0);
    await delay(120);
  });
  await page.addStyleTag({
    content: `
      *, *::before, *::after { animation-delay: 0s !important; animation-duration: 0s !important; transition-duration: 0s !important; }
      .pl8 [style*="opacity: 0"] { opacity: 1 !important; transform: none !important; }
    `,
  });
  await page.waitForTimeout(250);
}

const shot = new Set();
let count = 0;
for (const kit of KITS) {
  for (let vi = 0; vi < MAX_V; vi++) {
    const pairs = Object.entries(SECTIONS).map(([sec, vars]) => [sec, vars[vi % vars.length]]);
    // Skip page load entirely if every combo on it is already shot / filtered
    const todo = pairs.filter(([sec, variant]) => {
      const key = `${sec}-${variant}-${kit}`;
      if (shot.has(key)) return false;
      if (ONLY && !ONLY.has(`${kit}:${sec}:${variant}`)) return false;
      return true;
    });
    if (todo.length === 0) continue;
    const layouts = pairs.map(([s, v]) => `${s}:${v}`).join(',');
    const url = `${BASE}/dev/site?kit=${kit}&layouts=${encodeURIComponent(layouts)}`;
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
      /* Wait for hydration — the section content is client-rendered. */
      await page.waitForSelector('#schedule', { state: 'attached', timeout: 20_000 });
      await settle();
    } catch (err) {
      console.error(`LOAD FAIL ${url}: ${err.message}`);
      continue;
    }
    for (const [sec, variant] of todo) {
      const key = `${sec}-${variant}-${kit}`;
      shot.add(key);
      const file = path.join(OUT, `${key}-${WIDTH}.png`);
      try {
        const el = page.locator(`[data-section-id="${sec}"]`).first();
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(120);
        await el.screenshot({ path: file, timeout: 15_000 });
        count++;
        console.log(`ok ${key}`);
      } catch (err) {
        console.error(`SHOT FAIL ${key}: ${err.message}`);
      }
    }
  }
}

await browser.close();
console.log(`Done: ${count} shots in ${OUT}`);
