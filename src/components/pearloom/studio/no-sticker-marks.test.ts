// ─────────────────────────────────────────────────────────────
// The sticker fence (STUDIO-PLAN SV.6).
//
// Owner law, 2026-07-09: marks are STAMPED ink, never pastel
// sticker discs, and the squiggle glyph is gone completely.
// This test reads the SOURCE of the mark/motif surfaces (the
// same technique as the no-physical-promises fence) so neither
// can quietly return in a future session.
// ─────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const MOTIFS = join(ROOT, 'src/components/pearloom/motifs.tsx');
const STUDIO_DIR = join(ROOT, 'src/components/pearloom/studio');

/** The retired pastel disc backgrounds — the old Stamp's `bg`
 *  family. They may exist as PALETTE accents (tints are fine);
 *  they must never FILL a circle (that's the sticker disc). */
const PASTEL_DISC_FILL = /<circle[^>]*fill=(?:"|\{?['"`])#(?:C4B5D9|F0C9A8|CBD29E|F3E9D4)/i;

function studioSources(): Array<[string, string]> {
  return readdirSync(STUDIO_DIR)
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts'))
    .map((f) => [f, readFileSync(join(STUDIO_DIR, f), 'utf8')]);
}

describe('the sticker fence', () => {
  it('the squiggle components stay deleted', () => {
    const motifs = readFileSync(MOTIFS, 'utf8');
    expect(motifs).not.toMatch(/export (function|const) Squiggle/);
    expect(motifs).not.toMatch(/export (function|const) Filigree/);
  });

  it('no studio surface reaches for a squiggle', () => {
    for (const [file, src] of studioSources()) {
      expect(src, `${file} imports the deleted Squiggle`).not.toMatch(/import\s*\{[^}]*\bSquiggle\b[^}]*\}/);
    }
  });

  it('the Stamp is an ink postmark, never a filled disc', () => {
    const motifs = readFileSync(MOTIFS, 'utf8');
    const start = motifs.indexOf('export function Stamp');
    expect(start).toBeGreaterThan(-1);
    // The Stamp body runs to the next top-level export.
    const end = motifs.indexOf('\nexport ', start + 1);
    const stamp = motifs.slice(start, end === -1 ? undefined : end);
    // Every circle in the postmark is an unfilled ring.
    const circles = stamp.match(/<circle[^>]*>/g) ?? [];
    expect(circles.length).toBeGreaterThan(0);
    for (const c of circles) {
      expect(c, `Stamp circle must be fill="none": ${c}`).toContain('fill="none"');
    }
  });

  it('no pastel disc fill anywhere in the mark surfaces', () => {
    const motifs = readFileSync(MOTIFS, 'utf8');
    expect(motifs).not.toMatch(PASTEL_DISC_FILL);
    for (const [file, src] of studioSources()) {
      expect(src, `${file} draws a pastel sticker disc`).not.toMatch(PASTEL_DISC_FILL);
    }
  });
});
