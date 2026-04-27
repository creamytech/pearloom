'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editorial-icons.tsx
//
// A curated, hand-drawn SVG library beyond the basic motif glyphs
// in motifs.tsx. Every icon is paired with a section purpose so
// the editor's asset library can group them: Story, Schedule,
// Travel, Registry, Gallery, RSVP, FAQ, Decor.
//
// Animation modes:
//   - still     → no motion (default)
//   - hover     → plays once on parent :hover
//   - constant  → loops continuously (use sparingly)
//
// Modes are applied via the data-pl-icon-anim attribute and CSS
// classes defined in src/app/pearloom.css. Picking the mode lives
// in the editor (manifest.iconAnimations[name] = …); the renderer
// reads that map and stamps the right attribute on the SVG.
//
// All icons use viewBox="0 0 24 24" so they're a 1:1 swap for any
// motif Icon — drag-drop replace just works on top of these.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties, ReactElement } from 'react';

export type EditorialAnim = 'still' | 'hover' | 'constant';

export interface EditorialIconCommon {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export interface EditorialIconDef {
  /** Stable name — what manifest.iconOverrides keys against. */
  name: string;
  /** Human-readable label. */
  label: string;
  /** Editor section grouping. */
  group:
    | 'story'
    | 'schedule'
    | 'travel'
    | 'registry'
    | 'gallery'
    | 'rsvp'
    | 'faq'
    | 'decor'
    | 'people';
  /** Which animation modes look right for this glyph. The editor
   *  hides modes that don't make visual sense (e.g. a candle
   *  doesn't "rotate"). 'still' is always available. */
  anims: EditorialAnim[];
  /** Default animation when this icon is used without an explicit
   *  pick. Most are 'still' to avoid noise; a couple of decor
   *  glyphs default to a gentle 'constant' breathe. */
  defaultAnim: EditorialAnim;
  /** Render the SVG body (the children of <svg>, not the svg itself). */
  body: (color: string) => ReactElement;
  /** Optional flair: extra inline keyframes wired to the icon's
   *  internal parts. When present, applied on the inner element
   *  named via the `flairTarget` data attribute. */
  flair?: 'twinkle' | 'tick' | 'rotate' | 'breathe' | 'flicker' | 'draw' | 'sway';
}

// Helper for stroke paths.
const stroke = (color: string) => ({
  fill: 'none' as const,
  stroke: color,
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

// ── STORY ────────────────────────────────────────────────────
const KNOT: EditorialIconDef = {
  name: 'pl-knot',
  label: 'Love knot',
  group: 'story',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  flair: 'breathe',
  body: (c) => (
    <g {...stroke(c)} data-pl-flair>
      <path d="M8.5 12c0-2.8 2-4.5 4.2-3.5 2.3 1.1 1.7 4.6-.8 6.4-2.5 1.7-5 .9-5.6-1.2-.5-2 1.3-3.7 3.4-3.5 2 .2 3.6 2.1 3.6 4.4 0 2.4-1.8 4.4-4 4.4" />
      <circle cx="6" cy="11.5" r="0.6" fill={c} stroke="none" />
      <circle cx="18" cy="13" r="0.6" fill={c} stroke="none" />
    </g>
  ),
};

const THREAD_SPOOL: EditorialIconDef = {
  name: 'pl-thread-spool',
  label: 'Thread spool',
  group: 'story',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'still',
  flair: 'rotate',
  body: (c) => (
    <g data-pl-flair>
      <ellipse cx="12" cy="6" rx="6" ry="1.6" {...stroke(c)} />
      <ellipse cx="12" cy="18" rx="6" ry="1.6" {...stroke(c)} />
      <path d="M6 6v12M18 6v12" {...stroke(c)} />
      <path d="M8 9h8M7.5 12h9M8 15h8" {...stroke(c)} strokeWidth={0.8} />
      <path d="M12 18c4 1 6 3 6 4" {...stroke(c)} strokeWidth={0.8} />
    </g>
  ),
};

const SCROLL: EditorialIconDef = {
  name: 'pl-scroll',
  label: 'Unrolling scroll',
  group: 'story',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  body: (c) => (
    <g {...stroke(c)}>
      <path d="M5 6c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2" />
      <path d="M5 6c-1 0-1.5.7-1.5 1.5S4 9 5 9h2V6" />
      <path d="M19 18c1 0 1.5.7 1.5 1.5S20 21 19 21h-2v-3" />
      <path d="M9 9h6M9 12h6M9 15h4" strokeWidth={0.9} />
    </g>
  ),
};

const PRESSED_FLOWER: EditorialIconDef = {
  name: 'pl-pressed-flower',
  label: 'Pressed flower',
  group: 'story',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  flair: 'sway',
  body: (c) => (
    <g {...stroke(c)} data-pl-flair>
      <path d="M12 21V11" />
      <ellipse cx="9" cy="9" rx="2.5" ry="1.6" transform="rotate(-25 9 9)" />
      <ellipse cx="15" cy="9" rx="2.5" ry="1.6" transform="rotate(25 15 9)" />
      <ellipse cx="12" cy="6" rx="1.6" ry="2.4" />
      <circle cx="12" cy="9" r="1" fill={c} stroke="none" />
      <path d="M9 16l-2.5-1M15 14l2-2" strokeWidth={0.9} />
    </g>
  ),
};

const TREE_OF_LIFE: EditorialIconDef = {
  name: 'pl-tree-of-life',
  label: 'Tree of life',
  group: 'story',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  body: (c) => (
    <g {...stroke(c)}>
      <path d="M12 21V8" />
      <path d="M12 8c0-2 1.5-3 3-3M12 8c0-2-1.5-3-3-3" />
      <path d="M12 11c0-1.5 2-2.5 4-2M12 11c0-1.5-2-2.5-4-2" />
      <path d="M12 14c0-1 2-1.5 3.5-1M12 14c0-1-2-1.5-3.5-1" />
      <path d="M9 21h6" />
    </g>
  ),
};

// ── SCHEDULE ─────────────────────────────────────────────────
const HOURGLASS: EditorialIconDef = {
  name: 'pl-hourglass',
  label: 'Hourglass',
  group: 'schedule',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'still',
  flair: 'tick',
  body: (c) => (
    <g {...stroke(c)}>
      <path d="M7 3h10M7 21h10" />
      <path d="M8 3v3c0 2.5 4 3.5 4 6s-4 3.5-4 6v3" />
      <path d="M16 3v3c0 2.5-4 3.5-4 6s4 3.5 4 6v3" />
      <g data-pl-flair>
        <path d="M9.5 7c1 1 4 1 5 0" strokeWidth={0.8} />
        <path d="M11.5 12.5l1 1" strokeWidth={0.8} />
      </g>
    </g>
  ),
};

const SUN_ARC: EditorialIconDef = {
  name: 'pl-sun-arc',
  label: 'Sun arc',
  group: 'schedule',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'still',
  flair: 'rotate',
  body: (c) => (
    <g {...stroke(c)}>
      <path d="M3 17h18" />
      <path d="M5 17a7 7 0 0114 0" />
      <g data-pl-flair style={{ transformOrigin: '12px 17px' }}>
        <circle cx="12" cy="17" r="2.4" fill={c} stroke="none" opacity="0.85" />
        <path d="M12 8.6V7M16.2 9.3l1-1M19 13h1.5M3.5 13H5M7.8 9.3l-1-1" strokeWidth={0.9} />
      </g>
    </g>
  ),
};

const CANDLE_LIT: EditorialIconDef = {
  name: 'pl-candle-lit',
  label: 'Candle, lit',
  group: 'schedule',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'constant',
  flair: 'flicker',
  body: (c) => (
    <g {...stroke(c)}>
      <rect x="9" y="11" width="6" height="9" rx="0.6" />
      <path d="M9 14h6" />
      <path d="M9 20h6" />
      <g data-pl-flair style={{ transformOrigin: '12px 9px' }}>
        <path d="M12 11v-2" />
        <path d="M12 9c-1.4-.6-2-1.6-2-3 0-1.6 2-3.5 2-3.5s2 1.9 2 3.5c0 1.4-.6 2.4-2 3z" fill={c} fillOpacity="0.18" />
      </g>
    </g>
  ),
};

const BELL_TIME: EditorialIconDef = {
  name: 'pl-bell-time',
  label: 'Bell',
  group: 'schedule',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  flair: 'tick',
  body: (c) => (
    <g {...stroke(c)}>
      <g data-pl-flair style={{ transformOrigin: '12px 5px' }}>
        <path d="M6 17a6 6 0 0112 0v.5H6V17z" fill={c} fillOpacity="0.08" />
        <path d="M12 5v-2" />
        <path d="M9 19a3 3 0 006 0" />
        <path d="M5 17h14" />
      </g>
    </g>
  ),
};

const CLOCK_EDITORIAL: EditorialIconDef = {
  name: 'pl-clock-editorial',
  label: 'Editorial clock',
  group: 'schedule',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'still',
  flair: 'rotate',
  body: (c) => (
    <g {...stroke(c)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="0.6" fill={c} stroke="none" />
      <path d="M12 5v.6M19 12h-.6M12 19v-.6M5 12h.6" />
      <g data-pl-flair style={{ transformOrigin: '12px 12px' }}>
        <path d="M12 12V7M12 12l4 2.5" />
      </g>
    </g>
  ),
};

// ── TRAVEL ───────────────────────────────────────────────────
const COMPASS_ROSE: EditorialIconDef = {
  name: 'pl-compass-rose',
  label: 'Compass rose',
  group: 'travel',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'still',
  flair: 'rotate',
  body: (c) => (
    <g {...stroke(c)}>
      <circle cx="12" cy="12" r="9" />
      <g data-pl-flair style={{ transformOrigin: '12px 12px' }}>
        <path d="M12 4v16M4 12h16" strokeWidth={0.7} opacity="0.5" />
        <path d="M12 5l2.5 7-2.5 7-2.5-7z" fill={c} fillOpacity="0.18" />
        <path d="M5 12l7-2.5 7 2.5-7 2.5z" fill={c} fillOpacity="0.08" />
      </g>
      <text x="12" y="3.6" textAnchor="middle" fontSize="2.6" fill={c} stroke="none" fontFamily="Fraunces, serif">N</text>
    </g>
  ),
};

const PLANE_TRAIL: EditorialIconDef = {
  name: 'pl-plane-trail',
  label: 'Plane with trail',
  group: 'travel',
  anims: ['still', 'hover'],
  defaultAnim: 'hover',
  flair: 'draw',
  body: (c) => (
    <g {...stroke(c)}>
      <path d="M2 16c4-1 7-3 10-6 1.4-1.4 3-3 4-3l-3 5h2.5l3-2-2 4 1.5 2c-2 1-4 .5-5.5 1-2 .7-5 2-9 2" />
      <g data-pl-flair>
        <path d="M3 19c2-.4 4-1 6-2M3 21c1.4-.4 3-1 4.5-1.6" strokeWidth={0.8} strokeDasharray="2 2" opacity="0.6" />
      </g>
    </g>
  ),
};

const SUITCASE_VINTAGE: EditorialIconDef = {
  name: 'pl-suitcase-vintage',
  label: 'Vintage suitcase',
  group: 'travel',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  body: (c) => (
    <g {...stroke(c)}>
      <rect x="3.5" y="7" width="17" height="12" rx="1.2" />
      <path d="M9 7V5c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v2" />
      <path d="M3.5 12h17" />
      <circle cx="7" cy="15" r="0.6" fill={c} stroke="none" />
      <circle cx="9" cy="15" r="0.6" fill={c} stroke="none" />
      <path d="M14 15h3" />
    </g>
  ),
};

const MAP_FOLDED: EditorialIconDef = {
  name: 'pl-map-folded',
  label: 'Folded map',
  group: 'travel',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  body: (c) => (
    <g {...stroke(c)}>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v16M15 6v16" />
      <path d="M11.5 10c0-1 1.5-2 2.5-1.5l-1 3-1-1z" fill={c} fillOpacity="0.2" />
      <circle cx="12" cy="13" r="0.8" fill={c} stroke="none" />
    </g>
  ),
};

const ROAD_WINDING: EditorialIconDef = {
  name: 'pl-road-winding',
  label: 'Winding road',
  group: 'travel',
  anims: ['still', 'hover'],
  defaultAnim: 'hover',
  flair: 'draw',
  body: (c) => (
    <g {...stroke(c)} data-pl-flair>
      <path d="M6 21c1-3 4-4 6-6s2-5 4-7 4-2 4-2" />
      <path d="M9 21c.6-2 2.6-3 4-4.5" strokeDasharray="1.5 1.8" strokeWidth={0.8} />
    </g>
  ),
};

// ── REGISTRY ─────────────────────────────────────────────────
const GIFT_TIED: EditorialIconDef = {
  name: 'pl-gift-tied',
  label: 'Wrapped gift',
  group: 'registry',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  flair: 'breathe',
  body: (c) => (
    <g {...stroke(c)} data-pl-flair>
      <rect x="3.5" y="9" width="17" height="11" rx="0.8" />
      <path d="M3.5 13h17" />
      <path d="M12 9v11" />
      <path d="M12 9c-1.5-2-4-3-4-1 0 1 2 1.5 4 1z" fill={c} fillOpacity="0.18" />
      <path d="M12 9c1.5-2 4-3 4-1 0 1-2 1.5-4 1z" fill={c} fillOpacity="0.18" />
    </g>
  ),
};

const JAR_PENNIES: EditorialIconDef = {
  name: 'pl-jar-pennies',
  label: 'Coin jar',
  group: 'registry',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  body: (c) => (
    <g {...stroke(c)}>
      <path d="M8 4h8v2c0 .6.5 1 1 1.5C18 8.5 19 10 19 12v6a3 3 0 01-3 3H8a3 3 0 01-3-3v-6c0-2 1-3.5 2-4.5.5-.5 1-.9 1-1.5z" />
      <circle cx="9" cy="14" r="1.4" />
      <circle cx="14" cy="16" r="1.4" />
      <circle cx="11" cy="18" r="1" />
    </g>
  ),
};

const RINGS_BAND: EditorialIconDef = {
  name: 'pl-rings-band',
  label: 'Wedding rings',
  group: 'registry',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'still',
  flair: 'breathe',
  body: (c) => (
    <g {...stroke(c)} data-pl-flair>
      <circle cx="9" cy="14" r="5" />
      <circle cx="15" cy="14" r="5" />
      <circle cx="9" cy="14" r="0.6" fill={c} stroke="none" />
      <circle cx="15" cy="14" r="0.6" fill={c} stroke="none" />
    </g>
  ),
};

const BASKET_WOVEN: EditorialIconDef = {
  name: 'pl-basket-woven',
  label: 'Woven basket',
  group: 'registry',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  body: (c) => (
    <g {...stroke(c)}>
      <path d="M4 10h16l-2 11H6z" />
      <path d="M4 10h16" />
      <path d="M7 6c0-1.7 2.2-3 5-3s5 1.3 5 3" />
      <path d="M6 13l1.5 7M10 13l.5 7M14 13l-.5 7M18 13l-1.5 7" strokeWidth={0.8} opacity="0.6" />
      <path d="M5 14h14M5 17h14" strokeWidth={0.7} opacity="0.4" />
    </g>
  ),
};

// ── GALLERY ──────────────────────────────────────────────────
const POLAROID: EditorialIconDef = {
  name: 'pl-polaroid',
  label: 'Polaroid',
  group: 'gallery',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  flair: 'breathe',
  body: (c) => (
    <g {...stroke(c)} data-pl-flair>
      <rect x="4" y="4" width="16" height="16" rx="0.4" />
      <rect x="6" y="6" width="12" height="9" />
      <path d="M9 10l1.5 2 2-1.5L15 13" strokeWidth={0.8} />
      <circle cx="14" cy="9" r="1" fill={c} stroke="none" />
      <path d="M7 17.5h10" strokeWidth={0.6} opacity="0.5" />
    </g>
  ),
};

const CAMERA_VINTAGE: EditorialIconDef = {
  name: 'pl-camera-vintage',
  label: 'Vintage camera',
  group: 'gallery',
  anims: ['still', 'hover'],
  defaultAnim: 'hover',
  flair: 'tick',
  body: (c) => (
    <g {...stroke(c)} data-pl-flair>
      <path d="M3 8h3l1.5-2h9L18 8h3v11H3z" />
      <circle cx="12" cy="13.5" r="3.4" />
      <circle cx="12" cy="13.5" r="1.4" />
      <circle cx="18" cy="10" r="0.6" fill={c} stroke="none" />
    </g>
  ),
};

const FILM_STRIP: EditorialIconDef = {
  name: 'pl-film-strip',
  label: 'Film strip',
  group: 'gallery',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'still',
  flair: 'rotate',
  body: (c) => (
    <g {...stroke(c)}>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <rect x="4" y="4" width="3" height="16" />
      <rect x="17" y="4" width="3" height="16" />
      <circle cx="5.5" cy="7" r="0.6" fill={c} stroke="none" />
      <circle cx="5.5" cy="12" r="0.6" fill={c} stroke="none" />
      <circle cx="5.5" cy="17" r="0.6" fill={c} stroke="none" />
      <circle cx="18.5" cy="7" r="0.6" fill={c} stroke="none" />
      <circle cx="18.5" cy="12" r="0.6" fill={c} stroke="none" />
      <circle cx="18.5" cy="17" r="0.6" fill={c} stroke="none" />
    </g>
  ),
};

// ── RSVP ─────────────────────────────────────────────────────
const ENVELOPE_WAX: EditorialIconDef = {
  name: 'pl-envelope-wax',
  label: 'Sealed envelope',
  group: 'rsvp',
  anims: ['still', 'hover'],
  defaultAnim: 'hover',
  flair: 'breathe',
  body: (c) => (
    <g {...stroke(c)}>
      <rect x="3" y="6" width="18" height="13" rx="0.8" />
      <path d="M3 7l9 7 9-7" />
      <g data-pl-flair style={{ transformOrigin: '12px 13px' }}>
        <circle cx="12" cy="13" r="2.4" fill={c} fillOpacity="0.85" stroke={c} strokeWidth={0.6} />
        <path d="M11 13l1 1 1.5-1.5" stroke="white" strokeWidth={0.7} fill="none" />
      </g>
    </g>
  ),
};

const QUILL: EditorialIconDef = {
  name: 'pl-quill',
  label: 'Feather quill',
  group: 'rsvp',
  anims: ['still', 'hover'],
  defaultAnim: 'hover',
  flair: 'sway',
  body: (c) => (
    <g {...stroke(c)} data-pl-flair>
      <path d="M5 19l4-1c4-1 8-3 11-7s2-7 1-8-4 0-7 2-6 5-7 8-1 5-2 6z" />
      <path d="M11 13c.6-1 2-2 3-2.5M9 15c1-1 3-2 4-2.5M7 17c1-.5 2.6-1 3.5-1.5" strokeWidth={0.7} opacity="0.5" />
      <path d="M3 21l4-3" />
    </g>
  ),
};

const RIBBON_TIED: EditorialIconDef = {
  name: 'pl-ribbon-tied',
  label: 'Tied ribbon',
  group: 'rsvp',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  flair: 'sway',
  body: (c) => (
    <g {...stroke(c)} data-pl-flair>
      <path d="M12 12c-3-2-6-2-7 0s2 3 4 2.5 3 .5 3 1.5" />
      <path d="M12 12c3-2 6-2 7 0s-2 3-4 2.5-3 .5-3 1.5" />
      <circle cx="12" cy="12" r="1.4" fill={c} stroke="none" />
      <path d="M11 13l-2 7M13 13l2 7" />
    </g>
  ),
};

const CHECKMARK_FLOURISH: EditorialIconDef = {
  name: 'pl-checkmark-flourish',
  label: 'Flourish check',
  group: 'rsvp',
  anims: ['still', 'hover'],
  defaultAnim: 'hover',
  flair: 'draw',
  body: (c) => (
    <g {...stroke(c)} strokeWidth={1.8} data-pl-flair>
      <path d="M4 13l5 5L21 6" />
      <path d="M21 6c-2 0-3 1-3 1" strokeWidth={0.9} />
    </g>
  ),
};

// ── FAQ ──────────────────────────────────────────────────────
const QUILL_QUESTION: EditorialIconDef = {
  name: 'pl-quill-question',
  label: 'Quill with question',
  group: 'faq',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  body: (c) => (
    <g {...stroke(c)}>
      <path d="M16 4c-3 1-5 4-5 7s2 3 2 5-2 2-2 2" />
      <path d="M11 18a1 1 0 100 2 1 1 0 000-2z" fill={c} stroke="none" />
      <path d="M16 4c2-1 4 0 4 2s-2 3-4 2z" fill={c} fillOpacity="0.18" />
    </g>
  ),
};

const SPEECH_ITALIC: EditorialIconDef = {
  name: 'pl-speech-italic',
  label: 'Italic speech',
  group: 'faq',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  flair: 'breathe',
  body: (c) => (
    <g {...stroke(c)} data-pl-flair>
      <path d="M4 5h14c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2h-7l-5 4v-4H4c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2z" transform="skewX(-8)" />
      <path d="M9 11l1.5-3M14 12l1.5-3" strokeWidth={0.8} />
    </g>
  ),
};

const LIGHTBULB_FILAMENT: EditorialIconDef = {
  name: 'pl-lightbulb-filament',
  label: 'Filament bulb',
  group: 'faq',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'still',
  flair: 'flicker',
  body: (c) => (
    <g {...stroke(c)}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M9 18c-3-1.5-4-4-4-7a7 7 0 0114 0c0 3-1 5.5-4 7" />
      <g data-pl-flair>
        <path d="M9 14c1.5-2 4.5-2 6 0M10 12s1-1 2-1 2 1 2 1" strokeWidth={0.8} />
      </g>
    </g>
  ),
};

// ── DECOR ────────────────────────────────────────────────────
const FLEURON_PAIR: EditorialIconDef = {
  name: 'pl-fleuron-pair',
  label: 'Paired fleurons',
  group: 'decor',
  anims: ['still', 'constant'],
  defaultAnim: 'still',
  flair: 'breathe',
  body: (c) => (
    <g data-pl-flair>
      <path
        d="M 3 14 C 5 6, 13 6, 15 11 C 13 13, 7 14, 3 14 Z"
        fill={c}
        stroke="none"
        opacity="0.92"
      />
      <path
        d="M 21 14 C 19 6, 13 6, 11 11 C 13 13, 17 14, 21 14 Z"
        fill={c}
        stroke="none"
        opacity="0.92"
      />
      <circle cx="12" cy="12" r="1.4" fill={c} stroke="none" />
    </g>
  ),
};

const ASTERISM_TRI: EditorialIconDef = {
  name: 'pl-asterism-tri',
  label: 'Asterism',
  group: 'decor',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'constant',
  flair: 'twinkle',
  body: (c) => (
    <g fill={c} stroke="none" data-pl-flair>
      <path d="M6 12 L9 9 L12 12 L9 15 Z" />
      <path d="M14 8 L17 5 L20 8 L17 11 Z" />
      <path d="M14 16 L17 13 L20 16 L17 19 Z" />
    </g>
  ),
};

const LAUREL_HALF: EditorialIconDef = {
  name: 'pl-laurel-half',
  label: 'Laurel sprig',
  group: 'decor',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  flair: 'sway',
  body: (c) => (
    <g {...stroke(c)} data-pl-flair>
      <path d="M5 21c2-3 5-6 9-9s5-6 5-9" />
      <ellipse cx="9" cy="14" rx="1.6" ry="0.8" transform="rotate(-30 9 14)" fill={c} fillOpacity="0.4" />
      <ellipse cx="11" cy="11" rx="1.6" ry="0.8" transform="rotate(-40 11 11)" fill={c} fillOpacity="0.4" />
      <ellipse cx="13" cy="8" rx="1.6" ry="0.8" transform="rotate(-50 13 8)" fill={c} fillOpacity="0.4" />
      <ellipse cx="15" cy="6" rx="1.6" ry="0.8" transform="rotate(-60 15 6)" fill={c} fillOpacity="0.4" />
    </g>
  ),
};

const PEAR_GLYPH: EditorialIconDef = {
  name: 'pl-pear-glyph',
  label: 'Pear glyph',
  group: 'decor',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'still',
  flair: 'breathe',
  body: (c) => (
    <g data-pl-flair>
      <path
        d="M12 4c-.3 0-.6.1-.7.4-.3.6-.4 1.4-.4 2.2-2 .8-3.5 2.6-3.5 5 0 3 2 5.4 4.5 6 .4.1.8.1 1.2 0 2.5-.6 4.5-3 4.5-6 0-2.4-1.5-4.2-3.5-5 0-.8-.1-1.6-.4-2.2-.1-.3-.4-.4-.7-.4z"
        fill={c}
        fillOpacity="0.18"
        stroke={c}
        strokeWidth="1.2"
      />
      <path d="M12 5.5c-.5.6-.8 1.2-.8 1.8" {...stroke(c)} strokeWidth={0.8} />
    </g>
  ),
};

const SPARKLE_FOUR: EditorialIconDef = {
  name: 'pl-sparkle-four',
  label: 'Four-point sparkle',
  group: 'decor',
  anims: ['still', 'hover', 'constant'],
  defaultAnim: 'constant',
  flair: 'twinkle',
  body: (c) => (
    <g fill={c} stroke="none" data-pl-flair>
      <path d="M12 3l1 7 7 1-7 1-1 7-1-7-7-1 7-1z" />
      <path d="M19 14l.6 1.8 1.8.6-1.8.6L19 18.8 18.4 17l-1.8-.6 1.8-.6z" opacity="0.7" />
    </g>
  ),
};

// ── PEOPLE ───────────────────────────────────────────────────
const HANDS_HELD: EditorialIconDef = {
  name: 'pl-hands-held',
  label: 'Hands held',
  group: 'people',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  body: (c) => (
    <g {...stroke(c)}>
      <path d="M5 14V8c0-.6.4-1 1-1s1 .4 1 1v3" />
      <path d="M8 12V6c0-.6.4-1 1-1s1 .4 1 1v5" />
      <path d="M11 12V7c0-.6.4-1 1-1s1 .4 1 1v5" />
      <path d="M14 12V8c0-.6.4-1 1-1s1 .4 1 1v3.5c0 4.5-3 7.5-7 7.5s-5-3-5-3" />
      <path d="M14 11.5c.5-.4 1.5-1 2.6-1 1.4 0 2.4 1 2.4 2.5" />
    </g>
  ),
};

const SILHOUETTE_PAIR: EditorialIconDef = {
  name: 'pl-silhouette-pair',
  label: 'Silhouette pair',
  group: 'people',
  anims: ['still', 'hover'],
  defaultAnim: 'still',
  body: (c) => (
    <g {...stroke(c)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21c0-3 3-5 6-5s6 2 6 5" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M21 21c0-2.4-2-4-4-4" />
    </g>
  ),
};

// Final registry — single export for both the editor's icon picker
// and Icon's fallback resolver.
export const EDITORIAL_ICONS: EditorialIconDef[] = [
  // Story
  KNOT, THREAD_SPOOL, SCROLL, PRESSED_FLOWER, TREE_OF_LIFE,
  // Schedule
  HOURGLASS, SUN_ARC, CANDLE_LIT, BELL_TIME, CLOCK_EDITORIAL,
  // Travel
  COMPASS_ROSE, PLANE_TRAIL, SUITCASE_VINTAGE, MAP_FOLDED, ROAD_WINDING,
  // Registry
  GIFT_TIED, JAR_PENNIES, RINGS_BAND, BASKET_WOVEN,
  // Gallery
  POLAROID, CAMERA_VINTAGE, FILM_STRIP,
  // RSVP
  ENVELOPE_WAX, QUILL, RIBBON_TIED, CHECKMARK_FLOURISH,
  // FAQ
  QUILL_QUESTION, SPEECH_ITALIC, LIGHTBULB_FILAMENT,
  // Decor
  FLEURON_PAIR, ASTERISM_TRI, LAUREL_HALF, PEAR_GLYPH, SPARKLE_FOUR,
  // People
  HANDS_HELD, SILHOUETTE_PAIR,
];

// Indexed lookup so Icon's fallback resolution is O(1).
const EDITORIAL_INDEX = new Map<string, EditorialIconDef>(
  EDITORIAL_ICONS.map((d) => [d.name, d]),
);

export function getEditorialIcon(name: string): EditorialIconDef | undefined {
  return EDITORIAL_INDEX.get(name);
}

/** Animation modes available for a given icon — what the editor's
 *  per-icon picker should show. Always includes 'still'. */
export function animModesFor(name: string): EditorialAnim[] {
  return EDITORIAL_INDEX.get(name)?.anims ?? ['still'];
}

/** Render the editorial icon's body (the inner SVG paths/groups).
 *  Wraps in a group that stamps `data-pl-icon-flair` so CSS
 *  keyframes target the right inner element when applicable. */
export function renderEditorialBody(
  def: EditorialIconDef,
  color: string,
): ReactElement {
  return def.body(color);
}

/** Group icons by section so the editor's Icons tab can render
 *  one rail per group. Order matters — story first, decor + people
 *  last (least frequent). */
export const EDITORIAL_GROUPS: Array<{ key: EditorialIconDef['group']; label: string; items: EditorialIconDef[] }> = (
  [
    { key: 'story', label: 'Story' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'travel', label: 'Travel' },
    { key: 'registry', label: 'Registry' },
    { key: 'gallery', label: 'Gallery' },
    { key: 'rsvp', label: 'RSVP' },
    { key: 'faq', label: 'FAQ' },
    { key: 'decor', label: 'Decor' },
    { key: 'people', label: 'People' },
  ] as Array<{ key: EditorialIconDef['group']; label: string }>
).map((g) => ({
  ...g,
  items: EDITORIAL_ICONS.filter((d) => d.group === g.key),
}));
