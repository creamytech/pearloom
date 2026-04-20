// ─────────────────────────────────────────────────────────────
// Pearloom / plan-tiers.ts
//
// Maps every EditorTab to a pricing tier.
// Tiers: Journal (free/starter), Atelier (pro), Legacy (premium).
// When feature gating is ready, enforce access here.
// ─────────────────────────────────────────────────────────────

import type { EditorTab } from '@/lib/editor-state';

export type PlanTier = 'journal' | 'atelier' | 'legacy';

// Tab → tier. Journal tabs have no badge; Atelier/Legacy get labeled.
export const TAB_TIER: Partial<Record<EditorTab, PlanTier>> = {
  // ── Atelier ────────────────────────────────────────────────
  blocks:      'atelier',   // AI block generator
  voice:       'atelier',   // Voice trainer (AI concierge)
  guests:      'atelier',   // Full guest management
  seating:     'atelier',   // Interactive seating chart
  messaging:   'atelier',   // Bulk messaging & invitations
  analytics:   'atelier',   // Analytics dashboard
  translate:   'atelier',   // 9-language translations
  invite:      'atelier',   // Bulk invite panel
  savethedate: 'atelier',   // Save the Date card designer
  thankyou:    'atelier',   // AI Thank-You Notes generator
  // ── Legacy ─────────────────────────────────────────────────
  vendors:     'legacy',    // Vendor management
  spotify:     'legacy',    // Music/Spotify integration
};

// Display labels and accent colors per tier
export const TIER_META: Record<PlanTier, { label: string; color: string; bg: string }> = {
  journal: { label: 'Journal', color: '#5C6B3F', bg: 'rgba(163,177,138,0.14)' },
  atelier: { label: 'Atelier', color: '#6D597A', bg: 'rgba(109,89,122,0.12)'  },
  legacy:  { label: 'Legacy',  color: '#C4A96A', bg: 'rgba(196,169,106,0.14)' },
};
