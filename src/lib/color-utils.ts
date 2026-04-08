// ─────────────────────────────────────────────────────────────
// Pearloom / lib/color-utils.ts
// Color math for the design advisor:
//   • WCAG 2.1 contrast ratio (AA / AAA)
//   • Hex ↔ RGB ↔ HSL conversions
//   • Palette issue detection (contrast + harmony)
// ─────────────────────────────────────────────────────────────

// ── Conversions ───────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

/** Linearize an sRGB channel value (0–255) */
function linearize(val: number): number {
  const s = val / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a hex color (0–1) */
export function luminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG 2.1 contrast ratio between two hex colors.
 * Returns a value from 1 (no contrast) to 21 (black on white).
 */
export function contrastRatio(hex1: string, hex2: string): number | null {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA for normal text (≥ 4.5) */
export function passesAA(ratio: number): boolean {
  return ratio >= 4.5;
}

/** WCAG AA for large text / UI components (≥ 3.0) */
export function passesAALarge(ratio: number): boolean {
  return ratio >= 3.0;
}

// ── HSL conversions ───────────────────────────────────────────

export function hexToHsl(hex: string): [number, number, number] | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [ri, gi, bi] = rgb;
  const r = ri / 255, g = gi / 255, b = bi / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100]; // achromatic
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Angular distance between two hues on the color wheel (0–180) */
export function hueDist(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// ── Harmony analysis ──────────────────────────────────────────

export type HarmonyRelationship =
  | 'complementary'   // ~180° — bold contrast, intentional
  | 'analogous'       // < 30° — cohesive, soft
  | 'triadic'         // ~120° — vibrant but balanced
  | 'split-comp'      // ~150° — near complement but can feel unresolved
  | 'neutral'         // very low saturation — safe
  | 'clash';          // ~100–145° — the danger zone

export function harmonyBetween(hex1: string, hex2: string): HarmonyRelationship | null {
  const hsl1 = hexToHsl(hex1);
  const hsl2 = hexToHsl(hex2);
  if (!hsl1 || !hsl2) return null;

  // Very desaturated colors are "neutral" — don't clash
  if (hsl1[1] < 12 || hsl2[1] < 12) return 'neutral';

  const dist = hueDist(hsl1[0], hsl2[0]);

  if (dist < 30)                   return 'analogous';
  if (dist >= 165 && dist <= 195)  return 'complementary';
  if (dist >= 105 && dist <= 135)  return 'triadic';
  if (dist >= 140 && dist <= 165)  return 'split-comp';
  if (dist >= 85  && dist <= 145)  return 'clash';
  return 'analogous'; // < 85° and > 30° — still in analogous family
}

// ── Gradient mesh preset hue ranges ──────────────────────────

const MESH_HUE_CENTERS: Record<string, number> = {
  aurora:    195, // cyan-blue-purple
  sunset:     10, // red-orange-pink
  ocean:     205, // blue
  forest:    145, // green
  rose:      330, // pink-purple
  champagne:  40, // warm gold
  twilight:  280, // purple
  custom:    -1,  // uses accent color
};

// ── Auto-contrast enforcement ─────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}

/**
 * Lighten or darken a hex color by adjusting its luminance.
 * `amount` is 0–1 where 0.1 = 10% shift.
 */
function adjustLightness(hex: string, amount: number, direction: 'lighten' | 'darken'): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  if (direction === 'lighten') {
    return rgbToHex(
      r + (255 - r) * amount,
      g + (255 - g) * amount,
      b + (255 - b) * amount,
    );
  }
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/**
 * Returns a text color guaranteed to have at least `minRatio` contrast
 * against `bgHex`. If the original `textHex` already passes, returns it
 * unchanged. Otherwise lightens or darkens it until it meets the target.
 *
 * @param textHex  — the text/foreground color
 * @param bgHex   — the background color behind it
 * @param minRatio — minimum WCAG contrast ratio (default 4.5 for AA body text)
 */
export function ensureContrast(textHex: string, bgHex: string, minRatio = 4.5): string {
  const ratio = contrastRatio(textHex, bgHex);
  if (ratio !== null && ratio >= minRatio) return textHex;

  const bgLum = luminance(bgHex);
  if (bgLum === null) return textHex;

  // Decide direction: dark bg → lighten text, light bg → darken text
  const direction: 'lighten' | 'darken' = bgLum > 0.18 ? 'darken' : 'lighten';

  let adjusted = textHex;
  for (let step = 0.05; step <= 1; step += 0.05) {
    adjusted = adjustLightness(textHex, step, direction);
    const newRatio = contrastRatio(adjusted, bgHex);
    if (newRatio !== null && newRatio >= minRatio) return adjusted;
  }

  // Fallback: pure white or black
  return direction === 'lighten' ? '#FFFFFF' : '#000000';
}

/**
 * Enforce WCAG AA contrast minimums across a full palette.
 * Adjusts foreground, muted, accent, and ink colors in-place
 * so they're always readable against the background and card colors.
 * Returns a new palette object (does not mutate the input).
 */
export function enforcePaletteContrast(palette: {
  background: string; foreground: string; accent: string;
  accent2: string; card: string; muted: string;
  highlight: string; subtle: string; ink: string;
}): typeof palette {
  // Ensure foreground passes against both background and card
  let fg = ensureContrast(palette.foreground, palette.background, 4.5);
  const fgCardRatio = contrastRatio(fg, palette.card);
  if (fgCardRatio !== null && fgCardRatio < 4.5) {
    fg = ensureContrast(fg, palette.card, 4.5);
  }

  return {
    ...palette,
    foreground: fg,
    // Muted text on page background — at least AA large (3:1)
    muted: ensureContrast(palette.muted, palette.background, 3.0),
    // Accent on page background — at least AA large for UI elements (3:1)
    accent: ensureContrast(palette.accent, palette.background, 3.0),
    // Ink (headings) on page background — must pass AA (4.5:1)
    ink: ensureContrast(palette.ink, palette.background, 4.5),
  };
}

// ── Issue detection ───────────────────────────────────────────

export type IssueSeverity = 'error' | 'warn' | 'ok';

export interface DesignIssue {
  severity: IssueSeverity;
  code: string;
  title: string;
  detail: string;
}

interface PaletteCheckInput {
  background: string;
  foreground: string;
  accent: string;
  accentLight: string;
  muted: string;
  cardBg: string;
  meshPreset?: string;
}

export function detectPaletteIssues(colors: PaletteCheckInput): DesignIssue[] {
  const issues: DesignIssue[] = [];

  // 1. Foreground on background — primary reading contrast
  const fgBgRatio = contrastRatio(colors.foreground, colors.background);
  if (fgBgRatio !== null) {
    if (fgBgRatio < 3.0) {
      issues.push({
        severity: 'error', code: 'fg-bg-contrast',
        title: 'Text is hard to read',
        detail: `${fgBgRatio.toFixed(1)}:1 contrast — WCAG requires at least 4.5:1. Guests will struggle.`,
      });
    } else if (fgBgRatio < 4.5) {
      issues.push({
        severity: 'warn', code: 'fg-bg-contrast-aa',
        title: 'Text contrast is borderline',
        detail: `${fgBgRatio.toFixed(1)}:1 — below the WCAG AA standard of 4.5:1 for body text.`,
      });
    }
  }

  // 2. Foreground on card background
  const fgCardRatio = contrastRatio(colors.foreground, colors.cardBg);
  if (fgCardRatio !== null && fgCardRatio < 4.5) {
    issues.push({
      severity: 'warn', code: 'fg-card-contrast',
      title: 'Card text contrast low',
      detail: `${fgCardRatio.toFixed(1)}:1 on card backgrounds — content in panels may be hard to read.`,
    });
  }

  // 3. Accent on background (for CTA buttons)
  const accentBgRatio = contrastRatio(colors.accent, colors.background);
  if (accentBgRatio !== null && accentBgRatio < 3.0) {
    issues.push({
      severity: 'warn', code: 'accent-bg-contrast',
      title: 'RSVP button may be hard to spot',
      detail: `Accent color has only ${accentBgRatio.toFixed(1)}:1 contrast against your background.`,
    });
  }

  // 4. Background ≈ card background (invisible cards)
  const bgCardRatio = contrastRatio(colors.background, colors.cardBg);
  if (bgCardRatio !== null && bgCardRatio < 1.15) {
    issues.push({
      severity: 'warn', code: 'bg-card-identical',
      title: 'Cards blend into background',
      detail: 'Your background and card colors are nearly identical — sections lose their structure.',
    });
  }

  // 5. Accent vs background harmony
  const harmony = harmonyBetween(colors.accent, colors.background);
  if (harmony === 'clash') {
    issues.push({
      severity: 'warn', code: 'accent-harmony',
      title: 'Accent color clashes with background',
      detail: 'These hues sit in the "danger zone" on the color wheel — neither complementary nor analogous.',
    });
  }

  // 6. Gradient mesh vs accent harmony
  if (colors.meshPreset && colors.meshPreset !== 'none' && colors.meshPreset !== 'custom') {
    const meshHue = MESH_HUE_CENTERS[colors.meshPreset];
    const accentHsl = hexToHsl(colors.accent);
    if (meshHue !== undefined && meshHue !== -1 && accentHsl) {
      const dist = hueDist(meshHue, accentHsl[0]);
      if (dist >= 85 && dist <= 145 && accentHsl[1] > 20) {
        issues.push({
          severity: 'warn', code: 'mesh-accent-harmony',
          title: `"${colors.meshPreset}" mesh may clash with your accent`,
          detail: 'The mesh hues and accent sit in an unresolved color relationship. Try a complementary mesh preset.',
        });
      }
    }
  }

  // 7. Very dark background + dark accent (invisible CTAs)
  const bgLum = luminance(colors.background);
  const accentLum = luminance(colors.accent);
  if (bgLum !== null && bgLum < 0.08 && accentLum !== null && accentLum < 0.08) {
    issues.push({
      severity: 'warn', code: 'dark-on-dark',
      title: 'Dark accent on dark background',
      detail: 'Both your background and accent are dark — buttons and highlights will disappear.',
    });
  }

  return issues;
}
