// src/theme/colors.ts — single source of truth for all colours
// Import these instead of hardcoding hex values anywhere.

export const ACCENT      = '#18181B';   // zinc-900 — primary accent
export const ACCENT_DARK = '#09090B';   // zinc-950 — accessible text on light
export const FG          = '#18181B';   // zinc-900 foreground
export const BG_WARM     = '#FAFAFA';   // zinc-50 — clean off-white background
export const BG_DARK     = '#09090B';   // zinc-950 (site footer bg)
export const CREAM       = '#F4F4F5';   // zinc-100 — subtle section fill
export const MUTED       = 'rgba(24,24,27,0.06)'; // muted tint

// Semantic aliases
export const SUCCESS     = '#16A34A';
export const WARNING     = '#DC2626';
export const ERROR       = '#DC2626';

// Focus ring (WCAG AA)
export const FOCUS_RING  = `2px solid rgba(24,24,27,0.16)`;
