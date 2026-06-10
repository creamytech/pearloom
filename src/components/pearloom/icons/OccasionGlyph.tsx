'use client';

// ──────────────────────────────────────────────────────────────
// OccasionGlyph — bespoke hand-drawn SVG marks per occasion type.
// Each glyph carries a stable data-pl-glyph attribute that pairs
// with hover animations declared in pearloom.css (.pl8-glyph-*).
//
// Drawing language (matches the MotifScatter decor library):
//   - hairline strokes, round caps, organic curves — never the
//     stiff geometry of a stock icon set
//   - asymmetry and slight tilt so the marks read drawn, not
//     drafted
//   - ONE gold grace note per glyph (a berry, a pearl, a tassel
//     end) — the same single-gold-dot rule the motifs follow
//
// Why bespoke instead of the generic Icon library: every
// occasion deserves its own visual language. A wedding's rings
// shouldn't share an icon with an anniversary's pen, baby
// shower's rattle, retirement's watch, etc.
//
// Hover animations:
//   spin     — rings, watch
//   wiggle   — rattle, compass, coupes
//   bloom    — bouquet, starburst, tiara
//   flicker  — candles on the cake
//   draw     — stroke-dashoffset reveal (anniversary script, book)
//   sway     — leaf-bough, dove
//   pop      — cup, mortarboard, family circle, home
//
// Falls back to a brand sparkle for occasions without a custom
// glyph.
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
    return { kind: 'glasses', anim: 'wiggle', Component: ClinkingCoupes };
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
    return { kind: 'mitzvah', anim: 'pop', Component: StarScroll };
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
// Stroke inherits currentColor; the one gold grace note per glyph
// uses the brand gold token. ViewBox 24×24, strokeWidth 1.5 —
// reads as a crisp hairline at the 20px render the wizard uses.

interface S { size: number }
const GOLD = 'var(--pl-gold, #C19A4B)';
const stroke = (s: { size: number }) => ({
  width: s.size,
  height: s.size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** Two rings interlocked at an angle — the top one wears the stone. */
function Rings({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <circle cx="9.6" cy="14.2" r="4.7" />
      <circle cx="14.6" cy="11" r="4.7" />
      {/* marquise stone on the upper ring */}
      <path d="M16.2 3.2l1.5 1.6-1.5 1.6-1.5-1.6z" fill={GOLD} stroke="none" />
      {/* glint */}
      <path d="M20.2 3.4l1.4-1.2M21 6.2l1.4.2" strokeWidth="1.2" />
    </svg>
  );
}

/** Hand-tied posy — three stems gathered at a wrap, one gold berry. */
function Bouquet({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      {/* stems fanning out from the binding */}
      <path d="M12 15.6c-1.6-2.6-3-4.2-4.8-5.4" />
      <path d="M12 15.6c.1-2.8.3-4.8.7-6.8" />
      <path d="M12 15.6c1.6-2.4 3.1-3.9 5-5" />
      {/* bloom heads */}
      <circle cx="6.4" cy="9" r="1.9" />
      <circle cx="13" cy="7.2" r="1.9" />
      <circle cx="17.9" cy="9.6" r="1.9" />
      {/* the gold berry tucked into the posy */}
      <circle cx="9.8" cy="7.4" r="1.1" fill={GOLD} stroke="none" />
      {/* leaf */}
      <path d="M15.2 12.2c1.4-.2 2.4.2 3 1.2-1.2.5-2.3.3-3-1.2z" fill="currentColor" fillOpacity="0.16" />
      {/* ribbon wrap + tails */}
      <path d="M10.7 15.2l2.7 1" />
      <path d="M12 16c-.7 1.5-1.7 2.4-3 3M12 16c.9 1.3 2 2 3.3 2.4" />
    </svg>
  );
}

/** Compass rose — the trip-planning mark; gold north point. */
function CompassStar({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <circle cx="12" cy="12.6" r="7.8" />
      {/* needle — north half inked */}
      <path d="M12 6.2l1.7 6.4-1.7 6.4-1.7-6.4z" />
      <path d="M12 6.2l1.7 6.4h-3.4z" fill="currentColor" stroke="none" fillOpacity="0.75" />
      {/* cardinal ticks */}
      <path d="M5.4 12.6h-1M19.6 12.6h1M12 19.2v1" strokeWidth="1.2" />
      {/* gold north star */}
      <circle cx="12" cy="3.2" r="1.1" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** Two coupes mid-clink, spark where they touch. */
function ClinkingCoupes({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <g transform="rotate(-16 8 13)">
        <path d="M4.8 6.6h6.4c0 2.8-1.4 4.4-3.2 4.4S4.8 9.4 4.8 6.6z" />
        <path d="M8 11v6M5.8 18.4c1.4-.9 3-.9 4.4 0" />
      </g>
      <g transform="rotate(16 16 13)">
        <path d="M12.8 6.6h6.4c0 2.8-1.4 4.4-3.2 4.4s-3.2-1.6-3.2-4.4z" />
        <path d="M16 11v6M13.8 18.4c1.4-.9 3-.9 4.4 0" />
      </g>
      {/* clink sparks */}
      <path d="M12 3.2v-1M9.4 4.2l-.8-.9M14.6 4.2l.8-.9" strokeWidth="1.2" />
      <circle cx="12" cy="5.4" r="0.9" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** Morning cup on its saucer, steam curling. */
function CoffeeCup({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M6 10.4h9.6l-.8 5.6a3 3 0 01-3 2.6h-2a3 3 0 01-3-2.6z" />
      <path d="M15.6 11.6h1.6a1.9 1.9 0 01.2 3.8l-2.2.2" />
      <path d="M5 20.6c3.8.8 8 .8 11.8 0" />
      {/* steam */}
      <path d="M9 7.6c.6-1 0-1.7.6-2.9M12.2 7.6c.6-1 0-1.7.6-2.9" />
      <circle cx="15.8" cy="4.4" r="0.9" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** One cursive line that loops into a heart — drawn on hover. */
function ScriptHeart({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path
        d="M2.8 17.2c1.6-.9 2.8-.9 3.8-.4-1-2.6-1-5 .6-6.4 1.6-1.4 3.6-.8 4.8 1.4 1.2-2.2 3.2-2.8 4.8-1.4 1.6 1.4 1.6 3.9-.4 6.2-1.3 1.5-2.9 2.7-4.4 3.6-1.2-.7-2.4-1.6-3.5-2.6"
        className="pl8-glyph-draw-path"
      />
      <path d="M17.6 19.2c1.2-.2 2.2-.8 2.9-1.8" />
      {/* the full stop after the signature */}
      <circle cx="21.6" cy="18.6" r="1" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** Rattle with a banded head and looped handle, mid-shake. */
function Rattle({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <circle cx="9.2" cy="8.6" r="4.4" />
      {/* band across the head */}
      <path d="M5.4 6.4c2.4 1.5 5.2 1.5 7.6 0" />
      <circle cx="9.2" cy="9.8" r="1" fill={GOLD} stroke="none" />
      {/* handle with end loop */}
      <path d="M12.4 11.8l3.6 3.8" />
      <circle cx="17.4" cy="17.2" r="1.9" />
      {/* shake ticks */}
      <path d="M19.8 11.8l1.6-1.1M21 14.8l1.8-.3" strokeWidth="1.2" />
    </svg>
  );
}

/** Cottage gable with a curl of chimney smoke. */
function HouseGable({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M3.2 11.8L12 4.6l8.8 7.2" />
      <path d="M5.4 10.4v9c4.4.8 8.8.8 13.2 0v-9" />
      {/* arched door */}
      <path d="M10.2 19.8v-3.8a1.8 1.8 0 013.6 0v3.8" />
      <circle cx="12.9" cy="17.7" r="0.8" fill={GOLD} stroke="none" />
      {/* chimney + smoke curl */}
      <path d="M16.2 6.2V3.8h2.2v4.2" />
      <path d="M17.6 2.4c.7-.5.2-1 .8-1.4" strokeWidth="1.2" />
    </svg>
  );
}

/** Cake with scalloped icing and three lit candles. */
function BirthdayCake({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      {/* body with dripping icing */}
      <path d="M5.4 13.2v5.4c4.4 1 8.8 1 13.2 0v-5.4" />
      <path d="M5.4 13.2c1.1 1.9 2.2 1.9 3.3 0 1.1 1.9 2.2 1.9 3.3 0 1.1 1.9 2.2 1.9 3.3 0 1.1 1.9 2.2 1.9 3.3 0" />
      <path d="M4 20.8h16" />
      {/* candles */}
      <g className="pl8-glyph-flicker-stem">
        <path d="M8.6 12.6V9.8M12 12.2V9.2M15.4 12.6V9.8" />
      </g>
      {/* flames */}
      <g className="pl8-glyph-flicker-flame">
        <path d="M8.6 8c.8.9.8 1.6 0 1.6S7.8 8.9 8.6 8z" fill="currentColor" stroke="none" fillOpacity="0.7" />
        <path d="M12 7.2c.9 1 .9 1.8 0 1.8s-.9-.8 0-1.8z" fill={GOLD} stroke="none" />
        <path d="M15.4 8c.8.9.8 1.6 0 1.6s-.8-.7 0-1.6z" fill="currentColor" stroke="none" fillOpacity="0.7" />
      </g>
    </svg>
  );
}

/** Retro starburst — rays of three lengths, one orbiting gold spark. */
function Starburst({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M12 3.6v3.6M12 17.6v3M3.8 12.4h3.4M17.6 12.4h3M6.2 6.6l2.4 2.4M15.8 16l2.2 2.2M6.4 18.2l2.3-2.3M15.6 9l2.3-2.3" />
      <circle cx="12" cy="12.4" r="1.5" />
      <circle cx="19.4" cy="4.4" r="1.1" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** Tilted mortarboard, tassel swinging to a gold end. */
function Mortarboard({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M2.6 9.8L12 5.4l9.4 4.4-9.4 4.2z" />
      <path d="M7 12.4v3c0 1.7 2.2 2.8 5 2.8s5-1.1 5-2.8v-3" />
      {/* tassel draped off the board */}
      <path d="M12 9.8c2.5.6 4.4 2.4 4.8 5.7" />
      <circle cx="16.9" cy="16.6" r="1.1" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** Pocket watch — crown bow, hands at a quarter past. */
function PocketWatch({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <circle cx="12" cy="13.6" r="6.6" />
      <path d="M12 7V5.2" />
      <circle cx="12" cy="3.8" r="1.3" />
      {/* face ticks */}
      <path d="M12 8.6v1M16.8 13.6h-1M12 18.6v-1M7.2 13.6h1" strokeWidth="1.1" />
      {/* hands */}
      <path d="M12 13.6V10.4M12 13.6l2.6 1.5" />
      <circle cx="12" cy="13.6" r="0.9" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** Star of David above an open scroll. */
function StarScroll({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M12 3.2l3.2 5.5h-6.4z" strokeWidth="1.3" />
      <path d="M12 11.9L8.8 6.4h6.4z" strokeWidth="1.3" />
      <circle cx="12" cy="7.6" r="0.9" fill={GOLD} stroke="none" />
      {/* scroll: rolled handles + parchment */}
      <circle cx="6.4" cy="15.2" r="1.1" />
      <circle cx="17.6" cy="15.2" r="1.1" />
      <path d="M6.4 16.3v4.2M17.6 16.3v4.2" />
      <path d="M7.8 16.4h8.4M7.8 19.6h8.4" />
      <path d="M10.2 18h3.6" strokeWidth="1.1" />
    </svg>
  );
}

/** Tiara — rising arcs to a center pearl. */
function Tiara({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M4.2 16.2C5.4 11.2 8 9.2 12 9c4 .2 6.6 2.2 7.8 7.2" />
      <path d="M12 9V6.6" />
      <path d="M3.6 16.6c5.6 1.3 11.2 1.3 16.8 0" />
      <path d="M3.6 19c5.6 1 11.2 1 16.8 0" strokeWidth="1.1" />
      {/* side jewels + the center pearl */}
      <circle cx="6.6" cy="11.4" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="17.4" cy="11.4" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="5.2" r="1.2" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** Dove carrying an olive sprig — the brand's own branch. */
function Dove({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M4.6 13.8c2.6-1.7 5-2 7.2-.8 1.5-2.7 3.9-4 7.2-3.7-1.5 3.6-4 5.7-7.6 6.5l-1.5 3.4-2.4-2.3-2.9-.7z" />
      {/* lifted wing */}
      <path d="M11.4 12.6c.9-2 2.4-3.2 4.6-3.7" />
      {/* eye */}
      <circle cx="17.4" cy="10.2" r="0.6" fill="currentColor" stroke="none" />
      {/* olive sprig in the beak */}
      <path d="M19.4 9.6c1.2-.7 2.3-.9 3.2-.6" strokeWidth="1.2" />
      <circle cx="21.4" cy="7.8" r="0.9" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** Olive bough — paired leaves up a quiet arc, one gold berry. */
function LeafBough({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path d="M4.6 19.6C8.2 16.2 12.8 11.4 19.4 4.6" />
      {/* leaves alternating along the branch */}
      <path d="M7.8 16.6c-.4-2-1.5-3-3.4-3.2.5 2 1.6 3 3.4 3.2z" fill="currentColor" fillOpacity="0.16" />
      <path d="M9.6 14.7c2-.3 3-1.4 3.3-3.3-2 .4-3.1 1.5-3.3 3.3z" fill="currentColor" fillOpacity="0.16" />
      <path d="M12.6 11.7c-.3-2-1.4-3-3.3-3.3.4 2 1.5 3 3.3 3.3z" fill="currentColor" fillOpacity="0.16" />
      <path d="M14.4 9.8c2-.3 3-1.4 3.3-3.3-1.9.4-3 1.5-3.3 3.3z" fill="currentColor" fillOpacity="0.16" />
      <circle cx="18.4" cy="7.4" r="1" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** Three gathered figures, arms linked. */
function FamilyCircle({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <circle cx="7.2" cy="9.6" r="2.1" />
      <circle cx="12" cy="7.8" r="2.1" />
      <circle cx="16.8" cy="9.6" r="2.1" />
      <path d="M3.6 19.8c.5-3.2 2-4.9 3.6-5.1M20.4 19.8c-.5-3.2-2-4.9-3.6-5.1" />
      <path d="M8.4 20c.4-2.6 1.8-4.1 3.6-4.1s3.2 1.5 3.6 4.1" />
      {/* the spark above the gathering */}
      <circle cx="12" cy="3.4" r="0.9" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** Open book with a gold ribbon marker — drawn on hover. */
function OpenBook({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path
        d="M3.4 5.8c2.9-1.1 5.8-.7 8.6.9 2.8-1.6 5.7-2 8.6-.9v12.6c-2.9-1.1-5.8-.7-8.6.9-2.8-1.6-5.7-2-8.6-.9z"
        className="pl8-glyph-draw-path"
      />
      <path d="M12 6.7v12.6" />
      {/* the lines of the story */}
      <path d="M6 9.6c1.5-.4 2.9-.3 4.1.2M6 12.4c1.5-.4 2.9-.3 4.1.2" strokeWidth="1.1" />
      <path d="M13.9 9.8c1.2-.5 2.6-.6 4.1-.2" strokeWidth="1.1" />
      {/* ribbon marker */}
      <path d="M16.2 5.6v4.2" stroke={GOLD} strokeWidth="1.3" />
      <circle cx="16.2" cy="10.6" r="0.8" fill={GOLD} stroke="none" />
    </svg>
  );
}

/** Brand sparkle — concave four-point star + gold companion. */
function Sparkle({ size }: S) {
  return (
    <svg {...stroke({ size })}>
      <path
        d="M12 4.4c.7 3.5 2.4 5.4 6 6.2-3.6.8-5.3 2.7-6 6.2-.7-3.5-2.4-5.4-6-6.2 3.6-.8 5.3-2.7 6-6.2z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path d="M5.8 17.2l-.6 1.7-1.7.6 1.7.6.6 1.7.6-1.7 1.7-.6-1.7-.6z" strokeWidth="1.1" />
      <circle cx="19.2" cy="5" r="1" fill={GOLD} stroke="none" />
    </svg>
  );
}
