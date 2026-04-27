// ─────────────────────────────────────────────────────────────
// Pearloom / lib/theme.ts — dynamic theme injection
// ─────────────────────────────────────────────────────────────

import type { ThemeSchema } from '@/types';

/**
 * The default Pearloom theme.
 * Used when no AI-generated theme is available.
 * Boutique minimalist: warm ivory, charcoal, gold accent.
 */
export const defaultTheme: ThemeSchema = {
  name: 'pearloom-ivory',
  fonts: {
    heading: 'Playfair Display',
    body: 'Inter',
  },
  colors: {
    background: '#F5F1E8',
    foreground: '#2B2B2B',
    accent: '#c9a87c',
    accentLight: '#f5ead6',
    muted: '#9A9488',
    cardBg: '#ffffff',
  },
  borderRadius: '0.5rem',
};

type PaletteColors = ThemeSchema['colors'];

// ── Color utilities ────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0');
  const n = parseInt(full.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Relative luminance per WCAG 2.1. */
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const norm = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * norm(r) + 0.7152 * norm(g) + 0.0722 * norm(b);
}

function isHex(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v.trim());
}

/** Mix two hex colors by ratio (0 = a, 1 = b). */
function mix(a: string, b: string, ratio: number): string {
  const ra = hexToRgb(a); const rb = hexToRgb(b);
  return rgbToHex(
    ra.r + (rb.r - ra.r) * ratio,
    ra.g + (rb.g - ra.g) * ratio,
    ra.b + (rb.b - ra.b) * ratio,
  );
}

/** Bump saturation while preserving hue — used to keep accents punchy on dark. */
function vivify(hex: string, amount = 0.12): string {
  const { r, g, b } = hexToRgb(hex);
  const avg = (r + g + b) / 3;
  return rgbToHex(
    clamp(r + (r - avg) * amount, 0, 255),
    clamp(g + (g - avg) * amount, 0, 255),
    clamp(b + (b - avg) * amount, 0, 255),
  );
}

/**
 * Auto-derive a readable dark palette from a light palette.
 * Preserves the accent hue, darkens surfaces, flips text contrast.
 * Only invoked when `theme.darkColors` is absent.
 */
export function deriveDarkPalette(light: PaletteColors): PaletteColors {
  const accent = isHex(light.accent) ? vivify(light.accent, 0.08) : '#E8C786';
  const accentLight = isHex(light.accentLight)
    ? mix(light.accentLight, '#000000', 0.55)
    : mix(accent, '#000000', 0.55);

  return {
    // Deep ink base, lightly tinted by accent so dark mode keeps the vibe
    background: mix('#0D0B07', accent, 0.04),
    foreground: '#F4EDE0',
    accent,
    accentLight,
    muted: '#8A8474',
    cardBg: mix('#16130D', accent, 0.03),
  };
}

// ── CSS var emitters ────────────────────────────────────────────
const shapeMap: Record<string, string> = {
  square: '0px',
  rounded: '1.5rem',
  arch: '12rem 12rem 0.5rem 0.5rem',
  pill: '9999px',
};

type CardStyling = { shadow: string; border: string; bg: string };

function cardStylingFor(theme: ThemeSchema, cardBg: string): CardStyling {
  const styleMap: Record<string, CardStyling> = {
    solid: { shadow: '0 4px 12px rgba(0,0,0,0.02)', border: 'none', bg: cardBg },
    glass: { shadow: '0 8px 32px rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.6)' },
    bordered: { shadow: 'none', border: `2px solid ${theme.colors.accentLight}`, bg: 'transparent' },
    'shadow-heavy': { shadow: '0 25px 50px -12px rgba(0,0,0,0.2)', border: 'none', bg: cardBg },
  };
  return styleMap[theme.cardStyle || 'solid'] || styleMap['solid'];
}

function buildVarMap(theme: ThemeSchema, colors: PaletteColors): Record<string, string> {
  const cssRadius = shapeMap[theme.elementShape || 'rounded'] || theme.borderRadius;
  const cardStyling = cardStylingFor(theme, colors.cardBg);

  return {
    // Primary --pl-* namespace
    '--pl-cream': colors.background,
    '--pl-ink': colors.foreground,
    '--pl-olive': colors.accent,
    '--pl-olive-mist': colors.accentLight,
    '--pl-muted': colors.muted,
    '--pl-cream-card': cardStyling.bg,
    '--pl-font-heading': `"${theme.fonts.heading}", serif`,
    '--pl-font-body': `"${theme.fonts.body}", sans-serif`,
    '--pl-radius-md': cssRadius,
    '--pl-card-shadow': cardStyling.shadow,
    '--pl-card-border': cardStyling.border,
    // Legacy --eg-* aliases
    '--eg-bg': colors.background,
    '--eg-fg': colors.foreground,
    '--eg-accent': colors.accent,
    '--eg-accent-light': colors.accentLight,
    '--eg-muted': colors.muted,
    '--eg-card-bg': cardStyling.bg,
    '--eg-font-heading': `"${theme.fonts.heading}", serif`,
    '--eg-font-body': `"${theme.fonts.body}", sans-serif`,
    '--eg-radius': cssRadius,
    '--eg-card-shadow': cardStyling.shadow,
    '--eg-card-border': cardStyling.border,
    '--eg-bg-pattern': theme.backgroundPattern || 'noise',
  };
}

/**
 * Converts a ThemeSchema into a flat Record of CSS custom properties.
 * Returns the light-mode palette. Retained for components (wizard live preview,
 * editor chrome) that don't participate in dark mode switching.
 */
export function themeToCssVars(theme: ThemeSchema, mode: 'light' | 'dark' = 'light'): Record<string, string> {
  const colors = mode === 'dark'
    ? (theme.darkColors ?? deriveDarkPalette(theme.colors))
    : theme.colors;
  return buildVarMap(theme, colors);
}

/**
 * Returns two CSS declaration blocks (light + dark) ready to embed inside a
 * `<style>` tag. The blocks are scoped by `[data-theme=...]` so the browser
 * swaps variable values instantly when the toggle flips the attribute — no
 * React re-render needed.
 */
export function themeToCssBlocks(theme: ThemeSchema): { light: string; dark: string } {
  const toBlock = (vars: Record<string, string>) =>
    Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join(' ');
  return {
    light: toBlock(buildVarMap(theme, theme.colors)),
    dark: toBlock(buildVarMap(theme, theme.darkColors ?? deriveDarkPalette(theme.colors))),
  };
}

/**
 * Generates the Google Fonts import URL for a ThemeSchema.
 */
export function googleFontsUrl(theme: ThemeSchema): string {
  const families = [theme.fonts.heading, theme.fonts.body]
    .map((f) => f.replace(/ /g, '+'))
    .map((f) => `family=${f}:wght@300;400;500;600;700`)
    .join('&');

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
