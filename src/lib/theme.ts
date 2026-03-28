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
    background: '#F5F1E8',
    foreground: '#2B2B2B',
    accent: '#c9a87c',
    accentLight: '#f5ead6',
    muted: '#9A9488',
    cardBg: '#ffffff',
  },
  borderRadius: '0.5rem',
};

/**
 * Converts a ThemeSchema into a flat Record of CSS custom properties.
 * These are injected into :root by the ThemeProvider.
 *
 * Example output:
 *   '--eg-bg': '#F5F1E8'
 *   '--eg-fg': '#2B2B2B'
 *   '--eg-font-heading': 'Playfair Display, serif'
 */
export function themeToCssVars(theme: ThemeSchema): Record<string, string> {
  const shapeMap: Record<string, string> = {
    square: '0px',
    rounded: '1.5rem',
    arch: '12rem 12rem 0.5rem 0.5rem',
    pill: '9999px',
  };

  const cssRadius = shapeMap[theme.elementShape || 'rounded'] || theme.borderRadius;

  const styleMap: Record<string, { shadow: string; border: string; bg: string }> = {
    solid: { shadow: '0 4px 12px rgba(0,0,0,0.02)', border: 'none', bg: theme.colors.cardBg },
    glass: { shadow: '0 8px 32px rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.6)' },
    bordered: { shadow: 'none', border: `2px solid ${theme.colors.accentLight}`, bg: 'transparent' },
    'shadow-heavy': { shadow: '0 25px 50px -12px rgba(0,0,0,0.2)', border: 'none', bg: theme.colors.cardBg },
  };

  const cardStyling = styleMap[theme.cardStyle || 'solid'] || styleMap['solid'];

  return {
    '--eg-bg': theme.colors.background,
    '--eg-fg': theme.colors.foreground,
    '--eg-accent': theme.colors.accent,
    '--eg-accent-light': theme.colors.accentLight,
    '--eg-muted': theme.colors.muted,
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
 * Generates the Google Fonts import URL for a ThemeSchema.
 */
export function googleFontsUrl(theme: ThemeSchema): string {
  const families = [theme.fonts.heading, theme.fonts.body]
    .map((f) => f.replace(/ /g, '+'))
    .map((f) => `family=${f}:wght@300;400;500;600;700`)
    .join('&');

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
