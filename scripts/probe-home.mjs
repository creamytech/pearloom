import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    'C:/Users/benja/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const data = await page.evaluate(() => {
  const all = [...document.querySelectorAll('.pl8-hero-right')];
  const grid = document.querySelector('.pl8-split');
  return {
    count: all.length,
    items: all.map((el, i) => {
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        idx: i,
        parentTag: el.parentElement?.tagName,
        parentClass: el.parentElement?.className,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        opacity: cs.opacity,
        display: cs.display,
        animation: cs.animation.slice(0, 80),
        htmlLen: el.innerHTML.length,
      };
    }),
    grid: grid
      ? {
          gridTemplateColumns: getComputedStyle(grid).gridTemplateColumns,
          children: [...grid.children].map((c) => ({
            tag: c.tagName,
            cls: c.className,
            h: c.getBoundingClientRect().height,
            w: c.getBoundingClientRect().width,
          })),
        }
      : null,
  };
});
console.log(JSON.stringify(data, null, 2));

await browser.close();
