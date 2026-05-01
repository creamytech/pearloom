'use client';

// ──────────────────────────────────────────────────────────────
// OccasionGlyph — bespoke hand-drawn-feeling SVG icons per
// occasion type. Each glyph carries a stable data-pl-glyph
// attribute that pairs with hover animations declared in
// pearloom.css (.pl8-glyph-* keyframes).
//
// Why bespoke instead of the generic Icon library: every
// occasion deserves its own visual language. A wedding's rings
// shouldn't share an icon with an anniversary's pen, baby
// shower's rattle, retirement's watch, etc. The existing
// motifs.tsx Icon catalogue is great for chrome (arrows,
// search, send) but recycles 5 glyphs across 28 events.
//
// Hover animations:
//   spin     — rings, watch
//   wiggle   — rattle, compass
//   bloom    — bouquet, fireworks
//   flicker  — candle on cake
//   draw     — stroke-dashoffset reveal (anniversary script)
//   sway     — leaf-bough (memorial)
//
// Falls back to a generic editorial sparkle for occasions
// without a custom glyph.
// ──────────────────────────────────────────────────────────────

import type { CSSProperties, ReactElement } from 'react';

interface Props {
  id: string;
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export function OccasionGlyph({ id, size = 22, color = 'currentColor', style }: Props) {
  const glyph = pickGlyph(id);
  return (
    <span
      className={`pl8-glyph pl8-glyph-${glyph.anim}`}
      data-pl-glyph={glyph.kind}
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        color,
        ...style,
      }}
    >
      <glyph.Component size={size} />
    </span>
  );
}

type GlyphAnim = 'spin' | 'wiggle' | 'bloom' | 'flicker' | 'draw' | 'sway' | 'pop';

interface GlyphSpec {
  kind: string;
  anim: GlyphAnim;
  Component: (props: { size: number }) => ReactElement;
}

function pickGlyph(id: string): GlyphSpec {
  // Wedding arc — rings spin gently on hover.
  if (id === 'wedding' || id === 'engagement' || id === 'vow-renewal') {
    return { kind: 'rings', anim: 'spin', Component: Rings };
  }
  if (id === 'bridal-shower' || id === 'bridal-luncheon') {
    return { kind: 'bouquet', anim: 'bloom', Component: Bouquet };
  }
  if (id === 'bachelor-party' || id === 'bachelorette-party') {
    return { kind: 'compass', anim: 'wiggle', Component: CompassStar };
  }
  if (id === 'rehearsal-dinner') {
    return { kind: 'glasses', anim: 'wiggle', Component: WineGlasses };
  }
  if (id === 'welcome-party' || id === 'brunch') {
    return { kind: 'cup', anim: 'pop', Component: CoffeeCup };
  }

  // Family & home
  if (id === 'anniversary') {
    return { kind: 'script', anim: 'draw', Component: ScriptHeart };
  }
  if (id === 'baby-shower' || id === 'sip-and-see' || id === 'gender-reveal' || id === 'first-birthday') {
    return { kind: 'rattle', anim: 'wiggle', Component: Rattle };
  }
  if (id === 'housewarming') {
    return { kind: 'home', anim: 'pop', Component: HouseGable };
  }

  // Milestones
  if (id === 'birthday' || id === 'milestone-birthday') {
    return { kind: 'cake', anim: 'flicker', Component: BirthdayCake };
  }
  if (id === 'sweet-sixteen') {
    return { kind: 'starburst', anim: 'bloom', Component: Starburst };
  }
  if (id === 'graduation') {
    return { kind: 'mortarboard', anim: 'pop', Component: Mortarboard };
  }
  if (id === 'retirement') {
    return { kind: 'watch', anim: 'spin', Component: PocketWatch };
  }

  // Cultural
  if (id === 'bar-mitzvah' || id === 'bat-mitzvah') {
    return { kind: 'mitzvah', anim: 'pop', Component: TorahScroll };
  }
  if (id === 'quinceanera') {
    return { kind: 'tiara', anim: 'bloom', Component: Tiara };
  }
  if (id === 'baptism' || id === 'first-communion' || id === 'confirmation') {
    return { kind: 'dove', anim: 'sway', Component: Dove };
  }

  // Commemoration
  if (id === 'memorial' || id === 'funeral') {
    return { kind: 'bough', anim: 'sway', Component: LeafBough };
  }
  if (id === 'reunion') {
    return { kind: 'circle', anim: 'pop', Component: FamilyCircle };
  }

  // Story-only
  if (id === 'story') {
    return { kind: 'book', anim: 'draw', Component: OpenBook };
  }

  return { kind: 'sparkles', anim: 'bloom', Component: Sparkle };
}

// ── Glyph SVGs ──────────────────────────────────────────────────
// All use stroke="currentColor" + fill="none" by default so they
// inherit the parent's color. Each has a viewBox of 24x24 for
// consistency with the wider Icon catalogue.

interface S { size: number }
const stroke = (s: { size: number }) => ({
  width: s.size,
  height: s.size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

function Rings({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <circle cx="9" cy="13" r="5" />
      <circle cx="15" cy="13" r="5" />
      <path d="M7 5l2 3M17 5l-2 3" />
    </svg>
  );
}

function Bouquet({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="12" cy="10" r="2" />
      <path d="M12 12v8M9 14l3 3M15 14l-3 3" />
    </svg>
  );
}

function CompassStar({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4l1.6 6.4L20 12l-6.4 1.6L12 20l-1.6-6.4L4 12l6.4-1.6z" fill="currentColor" fillOpacity="0.18" />
    </svg>
  );
}

function WineGlasses({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M6 4h5l-1 6a2 2 0 11-3 0z" />
      <path d="M13 4h5l-1 6a2 2 0 11-3 0z" />
      <path d="M8.5 10v8M15.5 10v8M6 20h6M14 20h4" />
    </svg>
  );
}

function CoffeeCup({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M5 9h11v6a4 4 0 01-4 4H9a4 4 0 01-4-4z" />
      <path d="M16 11h2a2 2 0 010 4h-2" />
      <path d="M8 5c.5 1 0 1.5 0 2.5M11 5c.5 1 0 1.5 0 2.5" />
    </svg>
  );
}

function ScriptHeart({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path
        d="M5 14c2-3 5-3 7-1 2-2 5-2 7 1 0 4-7 7-7 7s-7-3-7-7z"
        strokeDasharray="60"
        strokeDashoffset="0"
        className="pl8-glyph-draw-path"
      />
      <path d="M12 4c1.5 1 1.5 2 0 3.5" />
    </svg>
  );
}

function Rattle({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <circle cx="9" cy="9" r="4" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <path d="M11.5 11.5l5.5 5.5" />
      <path d="M16 17l3 3M19 17l-3 3" strokeWidth="1.4" />
    </svg>
  );
}

function HouseGable({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function BirthdayCake({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <rect x="4" y="11" width="16" height="9" rx="1.5" />
      <path d="M4 14h16" />
      <path d="M12 11V7" className="pl8-glyph-flicker-stem" />
      <path d="M11.5 7c.4-.7 1-1 .5-1.7M12.5 7c-.3-.7.3-1 0-1.7" className="pl8-glyph-flicker-flame" />
    </svg>
  );
}

function Starburst({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4L9.8 14.2M14.2 9.8L18.4 5.6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function Mortarboard({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M2 9l10-4 10 4-10 4z" />
      <path d="M6 11v4c0 2 3 3 6 3s6-1 6-3v-4" />
      <path d="M22 9v5" />
      <circle cx="22" cy="15" r="0.8" fill="currentColor" />
    </svg>
  );
}

function PocketWatch({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 4v2M10 3h4" />
      <path d="M12 9v4l3 2" />
    </svg>
  );
}

function TorahScroll({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M5 5v14M19 5v14" strokeWidth="2" />
      <path d="M5 5h14M5 19h14" />
      <path d="M9 9h6M9 12h6M9 15h6" strokeWidth="1" />
    </svg>
  );
}

function Tiara({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M3 16l2-7 4 4 3-7 3 7 4-4 2 7" />
      <path d="M3 16h18" />
      <circle cx="6" cy="9.5" r="0.8" fill="currentColor" />
      <circle cx="12" cy="6.5" r="0.8" fill="currentColor" />
      <circle cx="18" cy="9.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

function Dove({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M3 13c2-2 5-3 8-2 2-2 5-3 9-2-2 4-5 6-9 7l-2 4-3-3-3-1z" />
      <circle cx="18" cy="9" r="0.7" fill="currentColor" />
    </svg>
  );
}

function LeafBough({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M5 19c4-3 8-7 14-15" />
      <path d="M8 17c0-2-1-3-3-3 0 2 1 3 3 3z" fill="currentColor" fillOpacity="0.18" />
      <path d="M11 14c0-2-1-3-3-3 0 2 1 3 3 3z" fill="currentColor" fillOpacity="0.18" />
      <path d="M14 11c0-2-1-3-3-3 0 2 1 3 3 3z" fill="currentColor" fillOpacity="0.18" />
      <path d="M17 8c0-2-1-3-3-3 0 2 1 3 3 3z" fill="currentColor" fillOpacity="0.18" />
    </svg>
  );
}

function FamilyCircle({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <circle cx="8" cy="9" r="2.4" />
      <circle cx="16" cy="9" r="2.4" />
      <circle cx="12" cy="15" r="2.4" />
      <path d="M4 21c.5-2.5 2.5-4 4-4M20 21c-.5-2.5-2.5-4-4-4M9 21c.5-2 1.5-3 3-3s2.5 1 3 3" />
    </svg>
  );
}

function OpenBook({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M3 5c3-1 6 0 9 1 3-1 6-2 9-1v13c-3-1-6 0-9 1-3-1-6-2-9-1z" />
      <path d="M12 6v13" />
    </svg>
  );
}

function Sparkle({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M12 4l1.8 4.8L18.6 10l-4.8 1.8L12 16.6 10.2 11.8 5.4 10l4.8-1.2z" fill="currentColor" fillOpacity="0.18" />
      <path d="M19 4l.8 2 2 .8-2 .8L19 9.6 18.2 7.6l-2-.8 2-.8z" />
    </svg>
  );
}
