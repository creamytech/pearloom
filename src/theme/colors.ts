// src/theme/colors.ts — single source of truth for all colours
// Import these instead of hardcoding hex values anywhere.

export const ACCENT      = '#A3B18A';   // sage green — primary accent
export const ACCENT_DARK = '#4A5A3A';   // dark sage — accessible text on light
export const FG          = '#2B2B2B';   // near-black foreground
export const BG_WARM     = '#FAF7F2';   // warm off-white background
export const BG_DARK     = '#3D3530';   // dark warm brown (site footer bg)
export const CREAM       = '#EEE8DC';   // cream / muted warm
export const MUTED       = 'rgba(163,177,138,0.12)'; // muted accent tint

// Semantic aliases
export const SUCCESS     = '#22c55e';
export const WARNING     = '#f59e0b';
export const ERROR       = '#ef4444';

// Focus ring (WCAG AA)
export const FOCUS_RING  = `2px solid rgba(163,177,138,0.6)`;
