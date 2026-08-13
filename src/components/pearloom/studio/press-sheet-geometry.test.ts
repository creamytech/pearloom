// ─────────────────────────────────────────────────────────────
// The press sheet's physical contract (ATELIER-PLAN ST.3). Pins:
//   • the card page is exactly 5×7″ trim + ⅛″ bleed on a 6×8 page
//   • the envelope is exact A7, artboard rotated onto the same page
//   • DOM→print cover scale is exact (420×588 card → ×1.2)
//   • no crop mark ever intrudes into the bleed box (live artwork)
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  CARD_PRESS,
  ENVELOPE_PRESS,
  PRESS_PAGE,
  bleedBox,
  trimBox,
  coverScale,
  cropMarks,
  MARK_GAP,
} from './press-sheet-geometry';

describe('press-sheet geometry — the physical contract', () => {
  it('the card page is 5×7 trim + eighth-inch bleed, centered on 6×8', () => {
    expect(CARD_PRESS).toMatchObject({ trimW: 5, trimH: 7, bleed: 0.125 });
    const t = trimBox(CARD_PRESS);
    expect(t).toEqual({ x: 0.5, y: 0.5, w: 5, h: 7 });
    const b = bleedBox(CARD_PRESS);
    expect(b).toEqual({ x: 0.375, y: 0.375, w: 5.25, h: 7.25 });
    expect(CARD_PRESS.artW).toBe(PRESS_PAGE.w);
    expect(CARD_PRESS.artH).toBe(PRESS_PAGE.h);
  });

  it('the envelope is exact A7 with no bleed; its landscape artboard rotates onto the portrait page', () => {
    expect(ENVELOPE_PRESS).toMatchObject({ trimW: 7.25, trimH: 5.25, bleed: 0 });
    expect(bleedBox(ENVELOPE_PRESS)).toEqual(trimBox(ENVELOPE_PRESS));
    // rotated 90°, the 8×6 artboard occupies 6×8 — the page.
    expect(ENVELOPE_PRESS.artW).toBe(PRESS_PAGE.h);
    expect(ENVELOPE_PRESS.artH).toBe(PRESS_PAGE.w);
  });

  it('the 420×588 canvas card scales ×1.2 to cover the bleed box exactly at the sides', () => {
    const s = coverScale(420, 588, CARD_PRESS);
    expect(s).toBe(1.2); // 420×1.2 = 504 CSS px = 5.25in — flush
    // vertical overshoot (705.6 vs 696) is clipped by the bleed box
    expect(588 * s).toBeGreaterThan(7.25 * 96);
  });

  it('the 540×380 canvas envelope covers A7', () => {
    const s = coverScale(540, 380, ENVELOPE_PRESS);
    expect(s).toBeCloseTo(504 / 380, 6);
    expect(540 * s).toBeGreaterThanOrEqual(7.25 * 96); // width overshoots, clipped
    expect(380 * s).toBeCloseTo(5.25 * 96, 6); // height-limited axis is flush
  });

  for (const [name, spec] of [['card', CARD_PRESS], ['envelope', ENVELOPE_PRESS]] as const) {
    it(`${name}: eight crop marks, all outside the bleed box, all on the artboard`, () => {
      const marks = cropMarks(spec);
      expect(marks).toHaveLength(8);
      const b = bleedBox(spec);
      for (const m of marks) {
        for (const [x, y] of [[m.x1, m.y1], [m.x2, m.y2]] as const) {
          // No endpoint may sit strictly inside the bleed box —
          // marks over live artwork would print onto the piece.
          const inside = x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h;
          expect(inside).toBe(false);
          // And everything stays on the artboard.
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(spec.artW);
          expect(y).toBeLessThanOrEqual(spec.artH);
        }
      }
    });
  }

  it('the mark gap is a real print-safe gap', () => {
    expect(MARK_GAP).toBeGreaterThan(0);
    const b = bleedBox(CARD_PRESS);
    const marks = cropMarks(CARD_PRESS);
    // the top-left horizontal mark ends exactly MARK_GAP left of the bleed box
    expect(marks[0].x2).toBeCloseTo(b.x - MARK_GAP, 10);
  });
});
