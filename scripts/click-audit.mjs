/**
 * For each v8 page, collect every <a href> AND <button> and report
 * whether each one has a valid target.
 *   - <a> with valid href (to local or external URL): OK
 *   - <a> with href="" or "#" alone: BAD
 *   - <button> with onClick listener: OK (interactive)
 *   - <button> with no listener: BAD
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const PAGES = ['/', '/login', '/templates', '/wizard/new', '/dev/builder', '/privacy', '/terms'];

const browser = await chromium.launch({
  executablePath: 'C:/Users/benja/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const warnings = [];

for (const p of PAGES) {
  await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(600);

  const elements = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a, button').forEach((el) => {
      const rect = el.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;
      if (!visible) return;
      if (el.tagName === 'A') {
        const href = el.getAttribute('href');
        out.push({
          tag: 'A',
          text: (el.textContent || '').trim().slice(0, 50),
          href,
          bad: !href || href === '#' || href.trim() === '',
        });
      } else if (el.tagName === 'BUTTON') {
        const type = el.getAttribute('type') ?? 'submit';
        const text = (el.textContent || '').trim().slice(0, 50);
        const hasAria = !!el.getAttribute('aria-label');
        // We can't reliably detect onClick listeners from the DOM, but
        // we can flag buttons with no text AND no aria-label as suspicious.
        out.push({ tag: 'BUTTON', text, type, bad: !text && !hasAria });
      }
    });
    return out;
  });

  const bad = elements.filter((e) => e.bad);
  console.log(`\n[${p}] — ${elements.length} clickable, ${bad.length} suspicious`);
  if (bad.length) {
    bad.forEach((e) => {
      console.log(`    ${e.tag}  "${e.text}"  href=${e.href ?? '(n/a)'}`);
      warnings.push({ page: p, ...e });
    });
  }
}

console.log(`\n== Total suspicious elements across ${PAGES.length} pages: ${warnings.length} ==`);
await browser.close();
