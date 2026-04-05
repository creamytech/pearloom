// ─────────────────────────────────────────────────────────────
// Pearloom Design Tokens v3 — single source of truth
// All values mirror the CSS vars in globals.css (:root block).
// Import from here, never hardcode hex values in components.
// ─────────────────────────────────────────────────────────────

// ── Color Palette ─────────────────────────────────────────────

export const colors = {
  // Base surfaces
  cream:      '#FAF7F2',   // --pl-cream
  deep:       '#F0EBE0',   // --pl-cream-deep
  card:       '#FFFFFF',   // --pl-cream-card
  ink:        '#1A1A1A',   // --pl-ink
  inkSoft:    '#3D3530',   // --pl-ink-soft
  muted:      '#7A756E',   // --pl-muted
  divider:    '#E0D8CA',   // --pl-divider

  // Brand
  olive:      '#A3B18A',   // --pl-olive
  oliveHover: '#8FA876',   // --pl-olive-hover
  oliveDeep:  '#6E8C5C',   // --pl-olive-deep
  oliveMist:  '#EEE8DC',   // --pl-olive-mist
  gold:       '#C4A96A',   // --pl-gold
  goldMist:   'rgba(196,169,106,0.12)',
  plum:       '#6D597A',   // --pl-plum
  plumMist:   'rgba(109,89,122,0.10)',

  // Dark surfaces (editor, generation)
  darkBg:      '#1E1B24',
  darkCard:    'rgba(255,255,255,0.09)',
  darkBorder:  'rgba(255,255,255,0.12)',
  darkText:    'rgba(245,241,232,0.55)',
  darkHeading: '#F5F1E8',

  // Backward-compat aliases
  dark:        '#3D3530',   // alias for inkSoft
  border:      '#E0D8CA',   // alias for divider
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

  // Named aliases for readability
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
  xs:   '0.72rem',    // micro labels, badges, uppercase tags
  sm:   '0.85rem',    // secondary text, captions, meta
  base: '0.95rem',    // body copy, descriptions
  md:   '1.05rem',    // emphasis paragraphs
  lg:   '1.15rem',    // subheadings, card titles
  xl:   '1.35rem',    // section sub-titles
  '2xl': 'clamp(1.9rem, 4vw, 2.8rem)',    // section headings
  '3xl': 'clamp(2.4rem, 5.5vw, 3.8rem)',  // hero headings
} as const;

// ── Border Radius ─────────────────────────────────────────────

export const radius = {
  xs:   '0.375rem',
  sm:   '0.625rem',
  md:   '0.875rem',
  lg:   '1.25rem',
  xl:   '1.75rem',
  full: '100px',
} as const;

// ── Shadows ───────────────────────────────────────────────────

export const shadow = {
  xs:   '0 1px 2px rgba(43,30,20,0.04)',
  sm:   '0 1px 4px rgba(43,30,20,0.05), 0 4px 14px rgba(43,30,20,0.04)',
  md:   '0 4px 16px rgba(43,30,20,0.08), 0 12px 40px rgba(43,30,20,0.05)',
  lg:   '0 12px 40px rgba(43,30,20,0.10), 0 24px 60px rgba(43,30,20,0.06)',
  xl:   '0 24px 60px rgba(43,30,20,0.12), 0 40px 80px rgba(43,30,20,0.07)',
  focus: '0 0 0 3px rgba(163,177,138,0.22)',
  glow: (color: string) => `0 0 14px ${color}88`,
} as const;

// ── Animation Easing ──────────────────────────────────────────

export const ease = {
  smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
  spring: { type: 'spring' as const, stiffness: 380, damping: 28 },
  duration: {
    fast:   0.15,
    normal: 0.32,
    slow:   0.6,
  },
} as const;

// ── Section Padding (responsive) ──────────────────────────────

export const sectionPadding = {
  y: 'clamp(3rem, 6vw, 6rem)',
  x: '1.5rem',
} as const;

// ── Layout Containers ─────────────────────────────────────────

export const layout = {
  /** Main page container */
  maxWidth:    '1080px',
  /** Page-level horizontal padding */
  padding:     '1.5rem',
  /** Narrow container for focused content */
  narrowWidth: '680px',
  /** Wide container for hero/showcase */
  wideWidth:   '1240px',
} as const;

// ── Card Styles ───────────────────────────────────────────────

export const card = {
  radius:      '0.875rem',
  bg:          '#FFFFFF',
  border:      `1px solid #E0D8CA`,
  shadow:      '0 1px 4px rgba(43,30,20,0.05), 0 4px 14px rgba(43,30,20,0.04)',
  shadowHover: '0 4px 16px rgba(43,30,20,0.08), 0 12px 40px rgba(43,30,20,0.05)',
} as const;

// ── Convenience re-export ─────────────────────────────────────

export const T = {
  colors,
  space,
  text,
  radius,
  shadow,
  ease,
  sectionPadding,
  card,
  layout,
} as const;
