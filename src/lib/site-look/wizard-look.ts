// ─────────────────────────────────────────────────────────────
// wizard-look — the bridge between what the wizard COLLECTED and
// what the canonical renderer actually READS.
//
// THE BUG THIS FIXES: generation wrote the deleted V8 renderer's
// contract (manifest.theme.colors / vibeSkin), while ThemedSite
// renders exclusively from manifest.themeVars (--t-* bag) +
// themeId + texture + layouts. Result: every generated site fell
// back to the default 'garden' theme and the host's palette,
// vibe, and layout choices silently evaporated.
//
// applyWizardLook() stamps the canonical fields — and only where
// they aren't already set, so the template path (which writes its
// own themeVars) and host edits always win.
//
// Palette semantics are defensive: the smart-palette contract is
// [background, primary, accent, contrast], but the wizard's preset
// palettes don't all comply — so roles are derived from the colors
// themselves (lightest → paper, darkest → ink, most saturated
// remaining → accent) rather than trusted by position.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { lookDefaultsFor, recommendTextureFor } from '@/lib/event-os/event-types';
import { MOTIF_LAYOUTS, motifLayoutForKit } from '@/lib/site-look/motif-layouts';
import { MOTIF_KINDS } from '@/components/pearloom/site/MotifScatter';

const MOTIF_KIND_SET: ReadonlySet<string> = new Set(MOTIF_KINDS);
const MOTIF_LAYOUT_SET: ReadonlySet<string> = new Set(MOTIF_LAYOUTS.map((l) => l.id));

type Loose = Record<string, unknown>;

// ── tiny color kit (server-safe, no deps) ────────────────────

interface Rgb { r: number; g: number; b: number }

function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex({ r, g, b }: Rgb): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}
function luminance(c: Rgb): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}
function saturation(c: Rgb): number {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  return max === 0 ? 0 : (max - min) / max;
}
function hueDeg(c: Rgb): number {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return ((h * 60) + 360) % 360;
}
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}
const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 20, g: 18, b: 14 };

// ── palette → --t-* bag ──────────────────────────────────────

/** Derive the renderer's --t-* color vars from 2-6 picked hexes.
 *  Returns only COLOR keys — fonts/radii/scale stay with the base
 *  theme via themeRootStyle's merge. Null when the input is junk. */
export function themeVarsFromPalette(colors: string[]): Record<string, string> | null {
  const rgbs = colors.map(hexToRgb).filter((c): c is Rgb => !!c);
  if (rgbs.length < 2) return null;

  const byLum = [...rgbs].sort((a, b) => luminance(b) - luminance(a));
  let paper = byLum[0];
  let ink = byLum[byLum.length - 1];
  // Comfort clamps: paper must read as paper, ink as ink — hosts
  // pick saturated mids and we anchor them rather than ship a
  // mud-on-mud site.
  if (luminance(paper) < 200) paper = mix(paper, WHITE, 0.78);
  if (luminance(ink) > 96) ink = mix(ink, BLACK, 0.72);

  const mids = byLum.slice(1, -1);
  const pool = mids.length ? mids : [byLum[0]];
  const accent = [...pool].sort((a, b) => saturation(b) - saturation(a))[0];
  const accent2 = pool.find((c) => c !== accent) ?? mix(accent, paper, 0.45);

  // Gold: a genuinely warm pick if the palette has one, else brand.
  const warm = rgbs.find((c) => { const h = hueDeg(c); return h >= 25 && h <= 60 && saturation(c) > 0.2 && luminance(c) > 80 && luminance(c) < 215; });
  const gold = warm ?? hexToRgb('#C19A4B')!;

  const inkRgba = (a: number) => `rgba(${Math.round(ink.r)},${Math.round(ink.g)},${Math.round(ink.b)},${a})`;

  return {
    '--t-paper': rgbToHex(paper),
    '--t-section': rgbToHex(mix(paper, accent, 0.10)),
    '--t-card': rgbToHex(mix(paper, WHITE, 0.5)),
    '--t-ink': rgbToHex(ink),
    '--t-ink-soft': rgbToHex(mix(ink, paper, 0.28)),
    '--t-ink-muted': rgbToHex(mix(ink, paper, 0.52)),
    '--t-accent': rgbToHex(accent),
    '--t-accent-2': rgbToHex(accent2),
    '--t-accent-bg': rgbToHex(mix(paper, accent, 0.16)),
    '--t-accent-ink': rgbToHex(mix(accent, BLACK, 0.3)),
    '--t-gold': rgbToHex(gold),
    '--t-line': inkRgba(0.16),
    '--t-line-soft': inkRgba(0.08),
    '--t-rsvp': rgbToHex(ink),
    '--t-rsvp-ink': rgbToHex(paper),
  };
}

// ── wizard layout → section variants ─────────────────────────

const LAYOUT_TO_VARIANTS: Record<string, Record<string, string>> = {
  timeline:  { story: 'timeline', schedule: 'timeline' },
  magazine:  { hero: 'typographic', story: 'letter', faq: 'twocol', details: 'iconrow' },
  filmstrip: { hero: 'fullbleed', gallery: 'slideshow', story: 'sidebyside' },
  bento:     { details: 'bento', gallery: 'grid', schedule: 'cards' },
};

// ── the bridge ───────────────────────────────────────────────

export interface WizardLookInput {
  selectedPaletteColors?: string[];
  layoutFormat?: string;
  occasion?: string;
  /** Ornament the palette advisor paired with the picked palette
   *  (one of the MotifScatter kinds). Off-catalog values dropped. */
  motifKind?: string;
  /** MotifLayer placement paired with the picked palette. */
  motifLayout?: string;
}

/** Stamp the canonical look fields the renderer reads. Fills only
 *  what's missing — template themes and host edits always win. */
export function applyWizardLook(manifest: StoryManifest, input: WizardLookInput): StoryManifest {
  const loose = manifest as unknown as Loose;
  const next: Loose = { ...loose };

  // 1. Palette → themeVars (the renderer's single color source).
  if (!next.themeVars && Array.isArray(input.selectedPaletteColors) && input.selectedPaletteColors.length >= 2) {
    const vars = themeVarsFromPalette(input.selectedPaletteColors);
    if (vars) {
      next.themeVars = vars;
      // themeId stays a base theme so fonts/radii keep a coherent
      // family; only set when nothing chose one already.
      if (!next.themeId) next.themeId = 'garden';
    }
  }

  // 2. Texture — the occasion's recommended material, unless a
  //    template/pack already picked one.
  if (next.texture === undefined || next.texture === null || next.texture === '') {
    const rec = input.occasion ? recommendTextureFor(input.occasion) : undefined;
    if (rec && rec !== 'smooth') next.texture = rec;
  }

  // 3. Component kit + rhythm — the occasion's look defaults
  //    (scrapbook kit for bachelor trips, index for memorials…),
  //    fill-missing so explicit picks survive.
  if (input.occasion) {
    const look = lookDefaultsFor(input.occasion);
    if (next.kitId === undefined) next.kitId = look.kitId;
    if (next.density === undefined) next.density = look.density;
    if (next.textureIntensity === undefined) next.textureIntensity = look.textureIntensity;
  }

  // 3b. Ornament + placement. The palette advisor's pick (rides
  //     with the chosen smart palette) wins over the kit default;
  //     both fill-missing so template/host picks survive. Values
  //     are validated against the catalogs — junk never lands on
  //     a manifest.
  if (next.motifKind === undefined && input.motifKind && MOTIF_KIND_SET.has(input.motifKind)) {
    next.motifKind = input.motifKind;
  }
  if (next.motifLayout === undefined) {
    if (input.motifLayout && MOTIF_LAYOUT_SET.has(input.motifLayout)) {
      next.motifLayout = input.motifLayout;
    } else if (input.occasion) {
      // Placement follows the kit (scrapbook→scattered,
      // plate→corners, index→margins…) so generated pages compose
      // coherently before the host opens the Decor picker.
      next.motifLayout = motifLayoutForKit(String(next.kitId));
    }
  }

  // 4. Wizard layout → section variants (merge under existing).
  const variantMap = LAYOUT_TO_VARIANTS[input.layoutFormat ?? ''];
  if (variantMap) {
    const existing = (next.layouts as Record<string, string> | undefined) ?? {};
    next.layouts = { ...variantMap, ...existing };
  }

  return next as unknown as StoryManifest;
}
