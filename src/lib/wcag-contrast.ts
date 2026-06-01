// ─────────────────────────────────────────────────────────────
// Pearloom / lib/wcag-contrast.ts
//
// WCAG 2.1 contrast scoring + a "tweak" suggestion engine for the
// palette picker. Wraps the lower-level math in `color-utils.ts`
// with semantic helpers (`rateContrast`, `suggestTweak`) tuned for
// the UI surface: rate any picked palette, show AAA / AA / fail,
// and when it fails suggest a single one-click correction.
//
// Body-text scoring uses normal-text thresholds:
//   AAA  ≥ 7.0
//   AA   ≥ 4.5
//   AA-L ≥ 3.0   (large text / UI components only — never body)
//   fail < 3.0
//
// The "tweak" is intentionally small (12% per call) so the host
// gets a nudge toward legibility without watching their palette
// flip wholesale. If the first 12% nudge still doesn't clear AA,
// the caller can call `suggestTweak` again on the result, which
// is exactly how a follow-up "still too faint?" pill would work.
// Today's MVP only offers one click — we trust the host to step
// in once we've made the worst case readable.
// ─────────────────────────────────────────────────────────────

import { hexToRgb, luminance } from './color-utils';

// ── Types ─────────────────────────────────────────────────────

export type ContrastRating = 'fail' | 'aa-large' | 'aa' | 'aaa';

export interface ContrastReport {
  /** Raw ratio (1–21). Null when either hex couldn't be parsed. */
  ratio: number | null;
  /** Bucketed rating against normal body-text thresholds. */
  rating: ContrastRating;
  /** Whether this clears the body-text minimum (AA = 4.5:1). */
  passesAA: boolean;
}

export interface ContrastTweak {
  /** Which colour we shifted to fix the failure. */
  target: 'foreground' | 'background';
  /** New hex for that colour. */
  hex: string;
  /** Resulting ratio against the un-tweaked other colour. */
  ratio: number;
  /** Human-readable description ("darker ink", "lighter paper"). */
  label: string;
}

// ── Public API ────────────────────────────────────────────────

/**
 * WCAG 2.1 relative luminance for a 3-tuple of 0–255 sRGB channels.
 * Mirrors the spec verbatim and matches `luminance(hex)` in
 * `color-utils.ts`. Exposed here so callers that already have RGB
 * don't have to round-trip through hex.
 */
export function relativeLuminance(rgb: [number, number, number]): number {
  const linearize = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = rgb;
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG 2.1 contrast ratio between two hex colors. Returns null when
 * either hex can't be parsed (caller should treat that as
 * "indeterminate", not as a fail — failing without a number to back
 * it up confuses hosts).
 *
 * Order-independent: contrastRatio(a, b) === contrastRatio(b, a).
 */
export function contrastRatio(aHex: string, bHex: string): number | null {
  const a = hexToRgb(aHex);
  const b = hexToRgb(bHex);
  if (!a || !b) return null;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Bucket a contrast ratio against the WCAG normal-text thresholds.
 * Use this for body type (the most demanding surface). For UI
 * components and large display type, `aa-large` (3:1) is the
 * applicable minimum — but body type is the constraint that
 * actually matters for a wedding-site picker.
 */
export function rateContrast(ratio: number): ContrastRating {
  if (ratio >= 7) return 'aaa';
  if (ratio >= 4.5) return 'aa';
  if (ratio >= 3) return 'aa-large';
  return 'fail';
}

/** Single-shot read for a (bg, fg) pair. */
export function reportContrast(bgHex: string, fgHex: string): ContrastReport {
  const ratio = contrastRatio(bgHex, fgHex);
  if (ratio === null) {
    return { ratio: null, rating: 'fail', passesAA: false };
  }
  const rating = rateContrast(ratio);
  return { ratio, rating, passesAA: rating === 'aa' || rating === 'aaa' };
}

/**
 * Produce a single one-click tweak that lifts a failing pair past
 * AA (≥ 4.5:1). Returns null when the pair already passes — callers
 * should hide the suggestion pill in that case.
 *
 * Strategy is deliberately simple: darken the foreground 12% when
 * the background is light (the common case for a paper palette);
 * lighten the foreground 12% when the background is dark. The 12%
 * step is large enough to move most borderline pairs past the
 * threshold in one click but small enough that the palette stays
 * recognisably "the one I picked" — we're nudging, not redesigning.
 *
 * When the foreground is already at an extreme (luminance < 0.05
 * or > 0.95) we instead nudge the background. This protects the
 * "pure ink on near-paper" wedding default from being pushed to
 * black-on-cream when the real fix is to lift the paper.
 */
export function suggestTweak(bgHex: string, fgHex: string): ContrastTweak | null {
  const ratio = contrastRatio(bgHex, fgHex);
  if (ratio === null || ratio >= 4.5) return null;

  const bgRgb = hexToRgb(bgHex);
  const fgRgb = hexToRgb(fgHex);
  if (!bgRgb || !fgRgb) return null;

  const bgLum = relativeLuminance(bgRgb);
  const fgLum = relativeLuminance(fgRgb);
  const bgIsLight = bgLum > fgLum;

  // Foreground already very dark / very light → nudge the
  // background instead. Otherwise we'd recommend pushing ink
  // past pure black, which doesn't actually move the ratio.
  const fgAtFloor = fgLum < 0.05;
  const fgAtCeiling = fgLum > 0.95;
  const tweakBackground = (bgIsLight && fgAtFloor) || (!bgIsLight && fgAtCeiling);

  if (tweakBackground) {
    // Lift the paper away from the ink: lighten if it's already
    // the lighter side, darken if it's the darker side.
    const nextBg = shiftHex(bgHex, 0.12, bgIsLight ? 'lighten' : 'darken');
    const newRatio = contrastRatio(nextBg, fgHex);
    if (newRatio === null) return null;
    return {
      target: 'background',
      hex: nextBg,
      ratio: newRatio,
      label: bgIsLight ? 'lighter paper' : 'deeper paper',
    };
  }

  // Default path: nudge the foreground. Darken on a light bg,
  // lighten on a dark bg.
  const direction: 'darken' | 'lighten' = bgIsLight ? 'darken' : 'lighten';
  const nextFg = shiftHex(fgHex, 0.12, direction);
  const newRatio = contrastRatio(bgHex, nextFg);
  if (newRatio === null) return null;
  return {
    target: 'foreground',
    hex: nextFg,
    ratio: newRatio,
    label: direction === 'darken' ? 'darker ink' : 'lighter ink',
  };
}

// ── Internal helpers ──────────────────────────────────────────

/**
 * Shift a hex colour toward white (lighten) or black (darken) by
 * `amount` (0–1, where 0.12 = 12%). Lightening moves each channel
 * a fraction of the way toward 255; darkening moves a fraction
 * toward 0. This is the same shape `color-utils.ts:adjustLightness`
 * uses internally — re-implemented here so we don't have to
 * export that private helper.
 */
function shiftHex(hex: string, amount: number, direction: 'lighten' | 'darken'): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  const shift = (v: number) => {
    if (direction === 'lighten') return v + (255 - v) * amount;
    return v * (1 - amount);
  };
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(clamp(shift(r)))}${toHex(clamp(shift(g)))}${toHex(clamp(shift(b)))}`;
}

/**
 * Format a ratio like "4.7:1" for chip labels. Hides the decimal
 * when the ratio is ≥ 10 (no precision is needed at that range —
 * the host can see at a glance that it passes).
 */
export function formatRatio(ratio: number): string {
  return ratio >= 10 ? `${Math.round(ratio)}:1` : `${ratio.toFixed(1)}:1`;
}

/**
 * Display label per rating bucket. Lives here (rather than in the
 * component) so the same vocabulary is reusable from `aria-label`
 * strings, tooltips, and any future contrast surface (e.g., the
 * Color Tokens inspector).
 */
export function ratingLabel(rating: ContrastRating): string {
  switch (rating) {
    case 'aaa':
      return 'AAA';
    case 'aa':
      return 'AA';
    case 'aa-large':
      return 'AA large';
    case 'fail':
      return 'FAIL';
  }
}
