/**
 * Click each main-nav link on the home page and verify it lands somewhere
 * meaningful (either scrolls to a section or navigates to a 2xx page).
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: 'C:/Users/benja/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + '/');

// Collect all nav links
const links = await page.$$eval('.topnav a[href]', (as) =>
  as.map((a) => ({ label: a.textContent?.trim() ?? '', href: a.getAttribute('href') ?? '' })).filter((l) => l.href && l.label),
);
console.log('Nav links found:');
links.forEach((l) => console.log(`   ${l.label.padEnd(16)} → ${l.href}`));

for (const l of links) {
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
    const target = await page.evaluate((href) => {
      const a = Array.from(document.querySelectorAll('.topnav a[href]')).find(
        (el) => el.getAttribute('href') === href,
      );
      if (!a) return { found: false };
      (a).click();
      return { found: true };
    }, l.href);
    if (!target.found) {
      console.log(`✖ ${l.label}: not clickable`);
      continue;
    }
    await page.waitForTimeout(900);
    const url = page.url();
    const pathAfter = url.replace(BASE, '');
    let scrollOk = true;
    let sectionVisible = '';
    if (l.href.includes('#')) {
      const anchor = l.href.split('#')[1];
      sectionVisible = await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (!el) return 'anchor-missing';
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight * 0.75) return `anchor-in-view (y=${Math.round(rect.top)})`;
        return `anchor-off-screen (y=${Math.round(rect.top)})`;
      }, anchor);
      if (!sectionVisible.startsWith('anchor-in-view')) scrollOk = false;
    }
    const bad = l.href.startsWith('/') && !l.href.includes('#') && pathAfter !== l.href;
    console.log(
      `${scrollOk && !bad ? '✓' : '✖'} ${l.label.padEnd(16)} href=${l.href}  →  landed=${pathAfter}  ${sectionVisible}`,
    );
  } catch (err) {
    console.log(`✖ ${l.label}: error — ${err.message.slice(0, 80)}`);
  }
}

await browser.close();
