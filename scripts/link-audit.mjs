/**
 * Crawl every public page, collect every <a href>, and check
 * each non-external link returns 2xx/3xx. Report broken links
 * grouped by source page.
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve(process.cwd(), '.audit/link-report.json');

const SEEDS = [
  '/',
  '/#product',
  '/#event-types',
  '/#features',
  '/#pricing',
  '/login',
  '/templates',
  '/wizard/new',
  '/dev/builder',
  '/privacy',
  '/terms',
  '/marketplace',
  '/partners',
  '/brand/groove',
  '/dashboard',
  '/dashboard/day-of',
];

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    'C:/Users/benja/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});
const ctx = await browser.newContext();
const page = await ctx.newPage();

const results = [];
const linkCache = new Map(); // href → {status, ok}

async function checkLink(href) {
  if (linkCache.has(href)) return linkCache.get(href);
  try {
    const r = await page.request.fetch(href, { method: 'GET', maxRedirects: 5 });
    const entry = { status: r.status(), ok: r.status() < 400 };
    linkCache.set(href, entry);
    return entry;
  } catch (err) {
    const entry = { status: 0, ok: false, error: String(err).slice(0, 120) };
    linkCache.set(href, entry);
    return entry;
  }
}

for (const seed of SEEDS) {
  const url = BASE + seed;
  let loadStatus = 'unknown';
  const brokenLinks = [];
  const allLinks = [];
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    loadStatus = resp?.status() ?? 'no-response';
    if (!resp || resp.status() >= 400) {
      results.push({ page: seed, loadStatus, brokenLinks: [], allLinks: [] });
      console.log(`[${loadStatus}] ${seed} — page itself errored`);
      continue;
    }
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') ?? '').filter(Boolean));
    const unique = [...new Set(hrefs)];
    for (const h of unique) {
      if (!h || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('#')) continue;
      if (/^https?:\/\//.test(h) && !h.startsWith(BASE)) continue; // skip external
      const fullHref = h.startsWith('http') ? h : BASE + (h.startsWith('/') ? h : '/' + h);
      const pathOnly = fullHref.startsWith(BASE) ? fullHref.slice(BASE.length) : fullHref;
      // ignore anchors-only variations
      if (pathOnly.startsWith('#')) continue;
      const bareUrl = fullHref.split('#')[0];
      const result = await checkLink(bareUrl);
      allLinks.push({ href: h, status: result.status, ok: result.ok });
      if (!result.ok) brokenLinks.push({ href: h, status: result.status });
    }
  } catch (err) {
    loadStatus = `error: ${String(err).slice(0, 120)}`;
  }
  results.push({ page: seed, loadStatus, brokenLinks, totalLinks: allLinks.length });
  if (brokenLinks.length) {
    console.log(`[BROKEN ${brokenLinks.length}] ${seed}:`);
    brokenLinks.forEach((b) => console.log(`    ${b.status}  ${b.href}`));
  } else {
    console.log(`[OK ${loadStatus}] ${seed} (${allLinks.length} links)`);
  }
}

await fs.writeFile(OUT, JSON.stringify(results, null, 2));
console.log('\nReport written to', OUT);
await browser.close();
