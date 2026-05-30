// ─────────────────────────────────────────────────────────────
// Canonical dashboard container constants.
//
// Every dashboard page that mounts inside DashLayout uses the
// same outer container so titles, cards, and footers align
// vertically across pages. Drifting widths or paddings created
// the "this page is narrower than the last one" jolt when
// navigating between Home, Sites, Guests, etc.
//
// Use these constants when authoring new pages or check a
// page's outer wrapper against them when changing layout.
//
// Audit 2026-05-30: standardized DashHomeV8 + WelcomeHome to
// these values; MemoryBookPage stays at 820 (intentionally
// narrow reading mode); WeekendBuilderPage at 1080 (defer).
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

/** Canonical max content width across dashboard pages. Matches
 *  the marketing site shell so visual rhythm carries through. */
export const DASH_MAX_WIDTH = 1240;

/** Horizontal padding clamp — 20px on phones, scales to 40px
 *  on wider viewports. Bottom padding 32 to clear the
 *  HelpBand + footer. */
export const DASH_CONTAINER_PADDING = '0 clamp(20px, 4vw, 40px) 32px';

/** Object spread style for the most common dashboard container.
 *
 *  Example:
 *    <div style={dashContainerStyle}>…</div>
 *
 *  When you need to override (e.g. narrower reading page),
 *  spread first then override the field:
 *    <div style={{ ...dashContainerStyle, maxWidth: 820 }}>…</div>
 */
export const dashContainerStyle: CSSProperties = {
  padding: DASH_CONTAINER_PADDING,
  maxWidth: DASH_MAX_WIDTH,
  margin: '0 auto',
};
