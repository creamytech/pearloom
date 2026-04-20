// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/panel-tokens.ts
// Canonical design tokens for editor panels. Every panel should
// import from here instead of hardcoding font sizes / colors /
// radii. Re-exports the base design-tokens and adds panel-specific
// additions (typography scale, event type palette).
//
// Editorial chrome (v2): The editor panels adopt the marketing
// "Editorial Modernism" voice — Fraunces italic section titles,
// mono uppercase eyebrows, gold hairlines, cream paper surfaces.
// Sizes stay compact (this is still a working inspector) but the
// type family carries the brand's editorial feel.
// ─────────────────────────────────────────────────────────────

import { colors, radius, shadow, ease } from '@/lib/design-tokens';

// ── Editorial font stacks ────────────────────────────────────
// Rebind to the global marketing font vars so the editor reads
// in the same voice. These vars are declared in globals.css and
// loaded via next/font in app/layout.tsx.
export const panelFont = {
  /** Fraunces italic — section titles, empty-state display copy. */
  display: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
  /** Geist sans — body copy, input values, descriptions. */
  body: 'var(--pl-font-body, system-ui, -apple-system, sans-serif)',
  /** Geist mono — uppercase tracked eyebrows, field labels, badges. */
  mono: 'var(--pl-font-mono, ui-monospace, monospace)',
} as const;

// ── Typography scale — the ONE panel text scale ──────────────
// Every panel heading / label / body / meta should pull from this
// map so sizes stay consistent across the whole editor.
export const panelText = {
  // SECTION TITLES — Fraunces italic, sentence case. Rendered with
  // panelFont.display by PanelSection.
  sectionTitle: '0.95rem',
  // SECTION EYEBROWS — mono uppercase label above/beside section title.
  heading: '0.58rem',
  // FIELD LABELS — mono uppercase "Accent Color", "Font pairing".
  label: '0.58rem',
  // ITEM TITLES — chapter titles, event names, page names (Title Case)
  itemTitle: '0.82rem',
  // Default body copy inside a panel section (Geist sans).
  body: '0.78rem',
  // Inline helper / description text under a heading or label.
  hint: '0.7rem',
  // Compact pill / chip text
  chip: '0.66rem',
  // Smallest meta — timestamps, counts, units
  meta: '0.56rem',
} as const;

// ── Line heights ─────────────────────────────────────────────
// Standardized line heights for each text size so panels have
// consistent vertical rhythm.
export const panelLineHeight = {
  tight: 1.15,     // display italic section titles
  snug: 1.35,      // body copy
  normal: 1.55,    // descriptive / hint text
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
  wider: '0.14em',
  widest: '0.22em',
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
  /** Section card border — softened to a near-hairline. */
  cardBorder: '1px solid var(--pl-chrome-border)',
  /** Section card corner radius — tight editorial 10px. */
  cardRadius: '10px',
  /** Default inner padding. */
  cardPadding: '16px',
  /** Gap between stacked sections inside a panel. */
  stackGap: '8px',
  /** Default bottom padding for a panel root. */
  rootPaddingBottom: '32px',
  /** Gold hairline under section headers — signature editorial rule. */
  hairline: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 28%, transparent)',
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
    border: '1px solid var(--pl-chrome-accent)',
    background: 'var(--pl-chrome-accent-soft)',
    color: 'var(--pl-chrome-text)',
  },
  hover: {
    borderColor: 'var(--pl-chrome-border-strong)',
  },
  radius: '8px',
  padding: '8px 14px',
  transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
} as const;

// ── Divider style ────────────────────────────────────────────
export const panelDivider = {
  color: 'var(--pl-chrome-border)',
  line: '1px solid var(--pl-chrome-border)',
  gapY: '12px',
  /** Gold editorial hairline — use between section header and body. */
  hairline: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 30%, transparent)',
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
