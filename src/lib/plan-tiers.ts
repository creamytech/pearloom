// ─────────────────────────────────────────────────────────────
// Pearloom / plan-tiers.ts
//
// Maps every EditorTab to a pricing tier.
// Nothing is gated yet — this is used only for labeling.
// When feature gating is ready, enforce access here.
// ─────────────────────────────────────────────────────────────

import type { EditorTab } from '@/lib/editor-state';

export type PlanTier = 'seed' | 'pair' | 'perennial';

// Tab → tier. Seed tabs have no badge; Pair/Perennial get labeled.
export const TAB_TIER: Partial<Record<EditorTab, PlanTier>> = {
  // ── Pair ────────────────────────────────────────────────────
  blocks:      'pair',   // AI block generator
  voice:       'pair',   // Voice trainer (AI concierge)
  guests:      'pair',   // Full guest management
  seating:     'pair',   // Interactive seating chart
  messaging:   'pair',   // Bulk messaging & invitations
  analytics:   'pair',   // Analytics dashboard
  translate:   'pair',   // 9-language translations
  invite:      'pair',   // Bulk invite panel
  savethedate: 'pair',   // Save the Date card designer
};

// Display labels and accent colors per tier
export const TIER_META: Record<PlanTier, { label: string; color: string; bg: string }> = {
  seed:      { label: 'Seed',      color: '#A3B18A', bg: 'rgba(163,177,138,0.14)' },
  pair:      { label: 'Pair',      color: '#6D597A', bg: 'rgba(109,89,122,0.12)'  },
  perennial: { label: 'Perennial', color: '#C4A96A', bg: 'rgba(196,169,106,0.14)' },
};
