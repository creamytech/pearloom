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
  label: '0.62rem',
  // Inline helper / description text under a heading or label
  hint: '0.68rem',
  // Default body copy inside a panel section
  body: '0.78rem',
  // Compact pill / chip text
  chip: '0.72rem',
  // Smallest meta — timestamps, counts, units
  meta: '0.58rem',
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
// These are the ONE canonical values for an editor panel card. They
// are hand-coded (not `var(--pl-radius-md)`) so the editor chrome
// never inherits the user's site-level `elementShape` (arch, pill,
// etc). PanelSection inlines these; local `Section` helpers in
// panels like ChapterPanel should pull from here too.
export const panelSection = {
  /** Section card background (translucent glass). */
  cardBg: 'rgba(255,255,255,0.5)',
  /** Section card border — subtle olive tint. */
  cardBorder: '1px solid rgba(163,177,138,0.18)',
  /** Section card corner radius — always 14px, never theme-driven. */
  cardRadius: '14px',
  /** Default inner padding. */
  cardPadding: '14px',
  /** Gap between stacked sections inside a panel. */
  stackGap: '10px',
  /** Default bottom padding for a panel root. */
  rootPaddingBottom: '24px',
} as const;

// ── Chip / selector states ────────────────────────────────────
// This is the single source of truth for "selected" vs
// "unselected" picker tiles across every panel. PanelChip consumes
// these values directly.

export const panelChip = {
  inactive: {
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.5)',
    color: 'var(--pl-ink-soft)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  active: {
    border: '2px solid var(--pl-olive)',
    background: 'rgba(163,177,138,0.1)',
    color: 'var(--pl-olive-deep)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  hover: {
    borderColor: 'var(--pl-olive-hover)',
  },
  radius: '12px',
  padding: '8px 14px',
  transition: 'all 0.15s ease',
} as const;

// ── Divider style ────────────────────────────────────────────
export const panelDivider = {
  color: 'rgba(255,255,255,0.2)',
  line: '1px solid rgba(255,255,255,0.2)',
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
