// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/panel-tokens.ts
// Canonical design tokens for editor panels. Every panel should
// import from here instead of hardcoding font sizes / colors /
// radii. Re-exports the base design-tokens and adds panel-specific
// additions (typography scale, event type palette).
// ─────────────────────────────────────────────────────────────

import { colors, radius, shadow, ease } from '@/lib/design-tokens';

// ── Typography scale — the ONE panel text scale ──────────────
// Every panel heading / label / body / meta should pull from this
// map so sizes stay consistent across the whole editor.
export const panelText = {
  // SECTION HEADINGS — "DESIGN", "COLORS", etc. (uppercase eyebrow)
  heading: '0.6rem',
  // FIELD LABELS — "Accent Color", "Font pairing" (uppercase)
  label: '0.6rem',
  // ITEM TITLES — chapter titles, event names, page names (Title Case)
  itemTitle: '0.8rem',
  // Default body copy inside a panel section
  body: '0.75rem',
  // Inline helper / description text under a heading or label
  hint: '0.65rem',
  // Compact pill / chip text
  chip: '0.65rem',
  // Smallest meta — timestamps, counts, units
  meta: '0.55rem',
} as const;

// ── Line heights ─────────────────────────────────────────────
// Standardized line heights for each text size so panels have
// consistent vertical rhythm.
export const panelLineHeight = {
  tight: 1.2,      // headings, item titles
  snug: 1.35,      // body copy
  normal: 1.5,     // descriptive / hint text
} as const;

export const panelWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  heavy: 800,
} as const;

export const panelTracking = {
  normal: '0',
  wide: '0.08em',
  wider: '0.1em',
  widest: '0.12em',
} as const;

// ── Section chrome ───────────────────────────────────────────
//
// Canonical values for an editor panel card. These bind to the
// chrome-only token layer (--pl-chrome-*) in globals.css so dark
// mode works without touching the user's site theme. Corner radius
// is hand-coded so the editor UI never inherits site-level
// `elementShape` (arch/pill/etc).
export const panelSection = {
  /** Section card background. */
  cardBg: 'var(--pl-chrome-surface)',
  /** Section card border. */
  cardBorder: '1px solid var(--pl-chrome-border)',
  /** Section card corner radius — 12px, never theme-driven. */
  cardRadius: '12px',
  /** Default inner padding. */
  cardPadding: '14px',
  /** Gap between stacked sections inside a panel. */
  stackGap: '10px',
  /** Default bottom padding for a panel root. */
  rootPaddingBottom: '24px',
} as const;

// ── Chip / selector states ────────────────────────────────────
// Selected vs unselected picker tiles. Consumed by PanelChip.

export const panelChip = {
  inactive: {
    border: '1px solid var(--pl-chrome-border)',
    background: 'var(--pl-chrome-surface)',
    color: 'var(--pl-chrome-text-muted)',
  },
  active: {
    border: '2px solid var(--pl-chrome-accent)',
    background: 'var(--pl-chrome-accent-soft)',
    color: 'var(--pl-chrome-text)',
  },
  hover: {
    borderColor: 'var(--pl-chrome-border-strong)',
  },
  radius: '8px',
  padding: '8px 14px',
  transition: 'all 0.15s ease',
} as const;

// ── Divider style ────────────────────────────────────────────
export const panelDivider = {
  color: 'var(--pl-chrome-border)',
  line: '1px solid var(--pl-chrome-border)',
  gapY: '12px',
} as const;

// ── Event type accent palette ────────────────────────────────
// Used by EventsPanel (and anywhere else that needs a color per
// event type). Previously hardcoded inline; now centralized so new
// event types get added in one place.
export const eventTypeColors: Record<string, string> = {
  ceremony: '#7c5cbf',        // Purple
  reception: '#e8927a',       // Coral
  rehearsal: '#4a9b8a',       // Teal
  'welcome-party': '#8b4a6a', // Plum
  brunch: '#c4774a',          // Rust
  other: '#6a8b4a',           // Sage
};

export function getEventTypeColor(type: string | undefined): string {
  if (!type) return eventTypeColors.other;
  return eventTypeColors[type] || eventTypeColors.other;
}

// Re-export base tokens so panels only need ONE import:
//   import { colors, radius, panelText } from '@/components/editor/panel';
export { colors, radius, shadow, ease };
