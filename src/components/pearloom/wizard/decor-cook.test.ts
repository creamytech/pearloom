// ─────────────────────────────────────────────────────────────
// Don't pay for pictures nobody looks at.
//
// The orphaned-field sweep found the wizard firing FOUR OpenAI
// image generations — the most expensive call in the product — as
// soon as an occasion and a palette resolved, then folding the
// result into `manifest.decorLibrary`, which the site renderer
// never reads. Venue and vibe are in the cache signature, so a host
// trying three palettes paid for twelve images and saw none of them.
//
// The invariant is a RELATIONSHIP, not a constant: speculative
// cooking is only justified once something on the site actually
// draws what it produces. So this test reads the renderer and
// decides. Wire `decorLibrary` into ThemedSite and the fence lifts
// on its own; leave it unwired and the pre-warm must stay off.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SPECULATIVE_DECOR_COOK } from './useBackgroundCook';

const ROOT = process.cwd();

/** Everything that paints a guest-facing site. */
const RENDERER_DIRS = [
  'src/components/pearloom/redesign',
  'src/components/pearloom/site',
  'src/app/sites',
];

function walk(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

function rendererReadsDecorLibrary(): string[] {
  const hits: string[] = [];
  for (const dir of RENDERER_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const text = fs.readFileSync(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        if (/\bdecorLibrary\b/.test(line)) {
          hits.push(`${path.relative(ROOT, file)}:${i + 1}`);
        }
      });
    }
  }
  return hits;
}

describe('speculative decor cooking is tied to a real consumer', () => {
  const consumers = rendererReadsDecorLibrary();

  it('does not pre-cook images the site cannot display', () => {
    if (consumers.length === 0) {
      expect(
        SPECULATIVE_DECOR_COOK,
        'The site renderer still never reads manifest.decorLibrary, so the wizard must not '
        + 'pre-generate four images per run. Either leave SPECULATIVE_DECOR_COOK false, or '
        + 'wire decorLibrary into ThemedSite first — this test lifts on its own once you do.',
      ).toBe(false);
    } else {
      // Someone wired it. The pre-warm is now legitimate; this
      // branch exists so the fence retires itself rather than
      // becoming a thing people delete to get work done.
      expect(consumers.length).toBeGreaterThan(0);
    }
  });

  it('scanned a renderer that actually exists', () => {
    // Without this, a renamed directory would make the scan return
    // zero hits and the assertion above would pass for the wrong
    // reason — the same vacuous-pass trap as the link audit.
    const files = RENDERER_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((f) => /ThemedSite\.tsx$/.test(f))).toBe(true);
  });
});
