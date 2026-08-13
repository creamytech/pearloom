// ─────────────────────────────────────────────────────────────
// Pearloom / studio/press-sheet-geometry.ts
//
// The press sheet's physical geometry (ATELIER-PLAN ST.3) — trim,
// bleed, and crop-mark math in INCHES, kept pure so the numbers
// are pinned by tests. StudioPressSheet turns these into CSS
// `in` units; the browser's print engine turns those into exact
// physical size on the PDF page. Pearloom presses the artwork;
// the host's printer presses the paper.
//
// Every piece rides a 6×8in page (@page { size: 6in 8in }):
//  • Card front/back — 5×7″ trim + ⅛″ bleed, artboard 6×8.
//  • Envelope — A7 (7.25×5.25″) trim, no bleed, artboard 8×6
//    rotated 90° to fit the same portrait page.
// ─────────────────────────────────────────────────────────────

/** CSS reference pixel density — 1in === 96 CSS px. */
export const CSS_DPI = 96;

/** The shared @page size, inches (portrait). Every artboard fits
 *  it — the envelope's landscape artboard rotated. */
export const PRESS_PAGE = { w: 6, h: 8 } as const;

/** Gap between a crop mark's inner end and the bleed edge, inches
 *  — marks must never touch live artwork. */
export const MARK_GAP = 0.0625;

/** Crop-mark length, inches. */
export const MARK_LEN = 0.25;

export interface PressSpec {
  /** Finished (trim) size, inches. */
  trimW: number;
  trimH: number;
  /** Bleed beyond trim on each side, inches (0 = trim-only). */
  bleed: number;
  /** Artboard size, inches — trim + room for the marks. */
  artW: number;
  artH: number;
}

/** 5×7″ card with standard ⅛″ bleed. */
export const CARD_PRESS: PressSpec = { trimW: 5, trimH: 7, bleed: 0.125, artW: 6, artH: 8 };

/** A7 envelope (7.25×5.25″), printed flat at trim — envelopes
 *  are converted, not trimmed through artwork, so no bleed. */
export const ENVELOPE_PRESS: PressSpec = { trimW: 7.25, trimH: 5.25, bleed: 0, artW: 8, artH: 6 };

export interface BoxIn { x: number; y: number; w: number; h: number }

/** The bleed box — trim grown by the bleed on each side, centered
 *  on the artboard. Artwork fills THIS box; the trim cut happens
 *  inside it. */
export function bleedBox(spec: PressSpec): BoxIn {
  const w = spec.trimW + 2 * spec.bleed;
  const h = spec.trimH + 2 * spec.bleed;
  return { x: (spec.artW - w) / 2, y: (spec.artH - h) / 2, w, h };
}

/** The trim box — the finished piece, centered on the artboard. */
export function trimBox(spec: PressSpec): BoxIn {
  return {
    x: (spec.artW - spec.trimW) / 2,
    y: (spec.artH - spec.trimH) / 2,
    w: spec.trimW,
    h: spec.trimH,
  };
}

/** Scale factor that makes a DOM-pixel card COVER the bleed box
 *  (max of the two axis ratios — the overshoot on the other axis
 *  is clipped by the bleed box, exactly how a print shop scales
 *  borderless art up into bleed). */
export function coverScale(domW: number, domH: number, spec: PressSpec): number {
  const box = bleedBox(spec);
  return Math.max((box.w * CSS_DPI) / domW, (box.h * CSS_DPI) / domH);
}

export interface MarkIn { x1: number; y1: number; x2: number; y2: number }

/** The eight crop marks — two per trim corner, running along the
 *  trim lines, held MARK_GAP outside the bleed box so no mark can
 *  print over live artwork. Coordinates in inches on the artboard. */
export function cropMarks(spec: PressSpec): MarkIn[] {
  const t = trimBox(spec);
  const inset = spec.bleed + MARK_GAP; // trim line → mark inner end
  const L = MARK_LEN;
  const left = t.x, right = t.x + t.w, top = t.y, bottom = t.y + t.h;
  return [
    // top-left corner
    { x1: left - inset - L, y1: top, x2: left - inset, y2: top },
    { x1: left, y1: top - inset - L, x2: left, y2: top - inset },
    // top-right corner
    { x1: right + inset, y1: top, x2: right + inset + L, y2: top },
    { x1: right, y1: top - inset - L, x2: right, y2: top - inset },
    // bottom-left corner
    { x1: left - inset - L, y1: bottom, x2: left - inset, y2: bottom },
    { x1: left, y1: bottom + inset, x2: left, y2: bottom + inset + L },
    // bottom-right corner
    { x1: right + inset, y1: bottom, x2: right + inset + L, y2: bottom },
    { x1: right, y1: bottom + inset, x2: right, y2: bottom + inset + L },
  ];
}
