// ─────────────────────────────────────────────────────────────
// everglow / lib/theme.ts — dynamic theme injection
// ─────────────────────────────────────────────────────────────

import type { ThemeSchema } from '@/types';

/**
 * The default Everglow theme.
 * Used when no AI-generated theme is available.
 * Boutique minimalist: warm ivory, charcoal, gold accent.
 */
export const defaultTheme: ThemeSchema = {
  name: 'everglow-ivory',
  fonts: {
    heading: 'Playfair Display',
    body: 'Inter',
  },
  colors: {
    background: '#faf9f6',
    foreground: '#1a1a1a',
    accent: '#c9a87c',
    accentLight: '#f5ead6',
    muted: '#8c8c8c',
    cardBg: '#ffffff',
  },
  borderRadius: '0.5rem',
};

/**
 * Converts a ThemeSchema into a flat Record of CSS custom properties.
 * These are injected into :root by the ThemeProvider.
 *
 * Example output:
 *   '--eg-bg': '#faf9f6'
 *   '--eg-fg': '#1a1a1a'
 *   '--eg-font-heading': 'Playfair Display, serif'
 */
export function themeToCssVars(theme: ThemeSchema): Record<string, string> {
  return {
    '--eg-bg': theme.colors.background,
    '--eg-fg': theme.colors.foreground,
    '--eg-accent': theme.colors.accent,
    '--eg-accent-light': theme.colors.accentLight,
    '--eg-muted': theme.colors.muted,
    '--eg-card-bg': theme.colors.cardBg,
    '--eg-font-heading': `"${theme.fonts.heading}", serif`,
    '--eg-font-body': `"${theme.fonts.body}", sans-serif`,
    '--eg-radius': theme.borderRadius,
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
