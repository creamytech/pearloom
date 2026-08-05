// ─────────────────────────────────────────────────────────────
// Every declared funnel event must actually fire somewhere.
//
// `signed_up` and `keepsake_generated` sat in ProductEventName for
// a month with no fire point anywhere in the codebase. Nothing
// caught it, because a declared-but-unfired event breaks no build
// and fails no test — it just quietly leaves the first and last
// steps of the north-star funnel blank, so the numbers look like a
// product nobody signs up for and nobody finishes.
//
// This scans the source for a real call site per declared name, so
// a future name added to the union without a caller fails here.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SELF = 'src/lib/analytics/product-events';

function walk(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** The names declared in the ProductEventName union. */
function declaredEvents(): string[] {
  const src = fs.readFileSync(path.join(ROOT, `${SELF}.ts`), 'utf8');
  const m = /export type ProductEventName =([\s\S]*?);/.exec(src);
  if (!m) throw new Error('ProductEventName union not found');
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
}

/** Files that could fire an event — everything but the module itself. */
const CALLERS = walk(path.join(ROOT, 'src'))
  .filter((f) => !f.includes(path.join('lib', 'analytics', 'product-events')))
  .filter((f) => !/\.test\.tsx?$/.test(f));

const CORPUS = CALLERS.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

describe('the funnel has no blank steps', () => {
  const events = declaredEvents();

  it('found the union', () => {
    // A regex that silently matched nothing would make every
    // assertion below pass vacuously.
    expect(events.length).toBeGreaterThan(3);
    expect(events).toContain('site_published');
  });

  it.each(declaredEvents())('%s is fired somewhere', (event) => {
    expect(
      CORPUS.includes(`'${event}'`),
      `"${event}" is declared in ProductEventName but nothing fires it. `
      + 'Either wire a call site or drop it from the union — a declared '
      + 'event that never fires reads as a step no user reaches.',
    ).toBe(true);
  });

  it('scanned a real corpus', () => {
    expect(CALLERS.length).toBeGreaterThan(100);
  });
});

describe('milestones fire once, not per request', () => {
  it('uses the once-per-site helper where the route runs repeatedly', () => {
    // first_rsvp_received runs on every reply; keepsake_generated on
    // every load of the memory book. Both must dedupe, or a funnel
    // step becomes a traffic metric.
    for (const file of ['src/app/api/rsvp/route.ts', 'src/app/api/memory-book/route.ts']) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      expect(text, `${file} should record its milestone once per site`)
        .toMatch(/recordProductEventOnce/);
    }
  });
});
