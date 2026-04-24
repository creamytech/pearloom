// ─────────────────────────────────────────────────────────────
// Pearloom Design Tokens v6 — Editorial Modernism
// Mirrors :root vars in src/app/globals.css. Import these in JS
// rather than hardcoding hex values. Dark-mode values resolve at
// runtime via CSS vars; this file exposes the LIGHT palette as
// the canonical numeric source.
// ─────────────────────────────────────────────────────────────

// ── Color Palette (light) ──────────────────────────────────────

export const colors = {
  // Surfaces (v8 tokens — product-wide design)
  cream:       '#FDFAF0',
  deep:        '#F7F0E0',
  card:        '#FBF7EE',
  ink:         '#18181B',
  inkSoft:     '#4A5642',
  muted:       '#6F6557',
  divider:     '#E2D9C3',
  dividerSoft: '#ECE4CF',

  // Brand (v8 tokens)
  olive:       '#5C6B3F',
  oliveHover:  '#4A5731',
  oliveDeep:   '#363F22',
  oliveMist:   '#E0DDC9',
  gold:        '#C19A4B',
  goldMist:    'rgba(193,154,75,0.10)',
  plum:        '#C6563D',
  plumMist:    'rgba(198,86,61,0.10)',

  // Authoring/dark surfaces
  darkBg:      '#0D0B07',
  darkCard:    'rgba(245,239,226,0.06)',
  darkBorder:  'rgba(245,239,226,0.10)',
  darkText:    'rgba(241,235,220,0.75)',
  darkHeading: '#F1EBDC',

  // Semantic states
  warning:     '#A14A2C',
  warningMist: 'rgba(161,74,44,0.10)',
  success:     '#5C6B3F',
  successMist: 'rgba(92,107,63,0.10)',

  // Backward-compat aliases
  dark:        '#3A332C',
  border:      '#D8CFB8',
} as const;

// ── Spacing Scale (4px base) ──────────────────────────────────

export const space = {
  '1':  '4px',
  '2':  '8px',
  '3':  '12px',
  '4':  '16px',
  '5':  '20px',
  '6':  '24px',
  '8':  '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
  xs:   '4px',
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
} as const;

// ── Typography Scale ──────────────────────────────────────────

export const text = {
  '2xs':  '0.66rem',
  xs:     '0.74rem',
  sm:     '0.82rem',
  base:   '0.92rem',
  md:     '1rem',
  lg:     '1.13rem',
  xl:     '1.32rem',
  '2xl':  '1.6rem',
  '3xl':  'clamp(2rem, 4vw, 2.6rem)',
  display: 'clamp(2.8rem, 6vw, 4.6rem)',
  marquee: 'clamp(4rem, 12vw, 9rem)',
} as const;

// ── Font families (CSS-var aware so they stay live) ───────────

export const fonts = {
  display: 'var(--pl-font-display)',
  heading: 'var(--pl-font-heading)',
  body:    'var(--pl-font-body)',
  mono:    'var(--pl-font-mono)',
} as const;

// ── Border Radius ─────────────────────────────────────────────

export const radius = {
  xs:   '0.25rem',
  sm:   '0.375rem',
  md:   '0.5rem',
  lg:   '0.75rem',
  xl:   '1rem',
  '2xl': '1.5rem',
  full: '100px',
} as const;

// ── Shadows (warm paper-shadow) ───────────────────────────────

export const shadow = {
  xs:   '0 1px 2px rgba(40,28,12,0.05)',
  sm:   '0 1px 3px rgba(40,28,12,0.06), 0 1px 2px rgba(40,28,12,0.04)',
  md:   '0 4px 16px rgba(40,28,12,0.08), 0 2px 6px rgba(40,28,12,0.05)',
  lg:   '0 8px 32px rgba(40,28,12,0.10), 0 4px 12px rgba(40,28,12,0.06)',
  xl:   '0 16px 48px rgba(40,28,12,0.12), 0 8px 20px rgba(40,28,12,0.08)',
  focus: '0 0 0 3px rgba(92,107,63,0.22)',
  glow: (color: string) => `0 0 14px ${color}88`,
} as const;

// ── Animation Easing & Duration ───────────────────────────────

export const ease = {
  out:    [0.22, 1, 0.36, 1] as [number, number, number, number],
  inOut:  [0.65, 0, 0.35, 1] as [number, number, number, number],
  spring: { type: 'spring' as const, stiffness: 380, damping: 28 },
  // Backward-compat alias
  smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
  duration: {
    instant: 0.1,
    fast:    0.18,
    normal:  0.28,
    slow:    0.48,
    glacial: 0.8,
  },
} as const;

// ── Section Padding (responsive) ──────────────────────────────

export const sectionPadding = {
  y: 'clamp(4rem, 8vw, 8rem)',
  x: 'clamp(1.25rem, 4vw, 2.5rem)',
} as const;

// ── Layout Containers ─────────────────────────────────────────

export const layout = {
  maxWidth:    '1180px',
  padding:     'clamp(1.25rem, 4vw, 2.5rem)',
  narrowWidth: '720px',
  wideWidth:   '1320px',
  rail:        '64px',
} as const;

// ── Card Styles ───────────────────────────────────────────────

export const card = {
  radius:      radius.lg,
  bg:          colors.card,
  border:      `1px solid ${colors.divider}`,
  shadow:      shadow.sm,
  shadowHover: shadow.md,
} as const;

// ── Convenience re-export ─────────────────────────────────────

export const T = {
  colors,
  space,
  text,
  fonts,
  radius,
  shadow,
  ease,
  sectionPadding,
  card,
  layout,
} as const;
