// ─────────────────────────────────────────────────────────────
// Pearloom Design Tokens — Single source of truth
// Import from here, not from marketing/colors.ts or globals.css
// ─────────────────────────────────────────────────────────────

// ── Color Palette ────────────────────────────────────────────

export const colors = {
  cream:   '#FAF7F2',
  deep:    '#F0EBE0',
  olive:   '#A3B18A',
  gold:    '#C4A96A',
  plum:    '#6D597A',
  ink:     '#1A1A1A',
  dark:    '#3D3530',
  muted:   '#7A756E',
  divider: '#E0D8CA',

  // Dark sections (The Loom, editor, generation)
  darkBg:      '#1E1B24',
  darkCard:    'rgba(255,255,255,0.10)',
  darkBorder:  'rgba(255,255,255,0.14)',
  darkText:    'rgba(245,241,232,0.6)',
  darkHeading: '#F5F1E8',
} as const;

// ── Spacing Scale (4px base) ─────────────────────────────────

export const space = {
  xs:   '4px',
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
} as const;

// ── Typography Scale ─────────────────────────────────────────

export const text = {
  xs:   '0.72rem',   // micro labels, badges, uppercase tags
  sm:   '0.85rem',   // secondary text, captions, meta
  base: '0.95rem',   // body copy, descriptions
  md:   '1.05rem',   // emphasis paragraphs, feature descriptions
  lg:   '1.1rem',    // subheadings, card titles
  xl:   '1.3rem',    // section sub-titles
  '2xl': 'clamp(1.9rem, 4vw, 2.8rem)',  // section headings
  '3xl': 'clamp(2.2rem, 5.5vw, 3.5rem)', // hero-level headings
} as const;

// ── Border Radius ────────────────────────────────────────────

export const radius = {
  sm:   '0.5rem',
  md:   '0.75rem',
  lg:   '1rem',
  xl:   '1.25rem',
  full: '100px',
} as const;

// ── Opacity Levels ───────────────────────────────────────────
// Use for border/bg alpha: `${colors.olive}${opacity.light}` → '#A3B18A1A'

export const opacity = {
  subtle:   '0F',  // 6%  — dot grids, faintest borders
  light:    '1A',  // 10% — hover backgrounds, secondary borders
  medium:   '33',  // 20% — active borders, badges
  strong:   '66',  // 40% — prominent borders, accents
  emphasis: '99',  // 60% — primary accents, strong indicators
} as const;

// ── Z-Index Stacking ─────────────────────────────────────────

export const zIndex = {
  dropdown:  50,
  sticky:   100,
  overlay:  200,
  modal:    300,
  toast:    400,
  max:      500,
} as const;

// ── Box Shadows ──────────────────────────────────────────────

export const shadow = {
  sm:  '0 2px 8px rgba(0,0,0,0.06)',
  md:  '0 4px 16px rgba(0,0,0,0.08)',
  lg:  '0 12px 40px rgba(0,0,0,0.12)',
  xl:  '0 20px 60px rgba(0,0,0,0.16)',
  glow: (color: string) => `0 0 14px ${color}88`,
} as const;

// ── Animation ────────────────────────────────────────────────

export const ease = {
  smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
  spring: { type: 'spring' as const, stiffness: 400, damping: 22 },
  duration: {
    fast:   0.15,
    normal: 0.35,
    slow:   0.6,
  },
} as const;

// ── Section Padding (responsive) ─────────────────────────────

export const sectionPadding = {
  y: 'clamp(3.5rem, 7vw, 7rem)',
  x: '1.25rem',
} as const;

// ── Layout Containers ────────────────────────────────────────
// Single source of truth for page-level max-widths.
// Every section must use one of these — no hardcoded widths.

export const layout = {
  /** Main page container — nav, sections, dashboard, wizard */
  maxWidth: '1080px',
  /** Horizontal padding on the container */
  padding: '2rem',
  /** Narrow container for focused content (forms, text-heavy sections) */
  narrowWidth: '720px',
  /** Wide container for hero/showcase sections */
  wideWidth: '1200px',
} as const;

// ── Card Styles (ONE standard, used everywhere) ─────────────

export const card = {
  radius:      '0.875rem',
  bg:          '#FFFFFF',
  border:      `1px solid ${colors.divider}`,
  shadow:      '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
  shadowHover: '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)',
} as const;

// ── Convenience re-export ────────────────────────────────────
// Shorthand for the full token set

export const T = {
  colors,
  space,
  text,
  radius,
  opacity,
  zIndex,
  shadow,
  ease,
  sectionPadding,
  card,
  layout,
} as const;
