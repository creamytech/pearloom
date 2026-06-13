'use client';

// ──────────────────────────────────────────────────────────────
// OccasionGlyph — bespoke hand-drawn SVG marks, ONE per occasion.
//
// Drawing language (matches the MotifScatter decor library):
//   - hairline strokes (1.5), round caps, organic curves — never
//     the stiff geometry of a stock icon set
//   - slight asymmetry/tilt so the marks read drawn, not drafted
//   - ONE gold grace note per glyph (a pearl, a flame, a berry)
//   - 24×24 viewBox, currentColor ink, STATIC — the 2026-06 redo
//     removed the hover animation classes; the marks hold still
//     and let the occasion cards breathe
//
// Every occasion id gets a UNIQUE mark — a wedding's interlocked
// rings, an engagement's solitaire, a vow renewal's ribboned
// bands, a bachelorette's popped bottle. No more sharing one
// rattle across four baby events. Unknown ids fall back to the
// brand sparkle.
// ──────────────────────────────────────────────────────────────

import type { CSSProperties, ReactElement, ReactNode } from 'react';

const GOLD = 'var(--pl-gold, #C19A4B)';

interface Props {
  id: string;
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export function OccasionGlyph({ id, size = 22, color = 'currentColor', style }: Props) {
  const Component = GLYPHS[id] ?? Sparkle;
  return (
    <span
      className="pl8-glyph"
      data-pl-glyph={GLYPHS[id] ? id : 'sparkle'}
      style={{ display: 'inline-grid', placeItems: 'center', width: size, height: size, color, ...style }}
    >
      <Component size={size} />
    </span>
  );
}

type G = (props: { size: number }) => ReactElement;

/* Shared svg shell — stroke-first, round everything. */
function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

/* ── Wedding arc ─────────────────────────────────────────────── */

// wedding — interlocked rings, gold pearl at the crossing.
const Wedding: G = ({ size }) => (
  <Svg size={size}>
    <circle cx="9.4" cy="13.2" r="5.4" />
    <circle cx="15" cy="10.6" r="5.4" />
    <circle cx="12.4" cy="11.6" r="1.1" fill={GOLD} stroke="none" />
  </Svg>
);

// engagement — a solitaire: band + faceted stone.
const Engagement: G = ({ size }) => (
  <Svg size={size}>
    <circle cx="12" cy="14.6" r="5.6" />
    <path d="M9.6 6.8 L12 3.4 L14.4 6.8 L12 9.2 Z" />
    <path d="M9.6 6.8 H14.4" />
    <circle cx="12" cy="6.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// vow-renewal — two bands beneath a tied ribbon arc.
const VowRenewal: G = ({ size }) => (
  <Svg size={size}>
    <circle cx="9" cy="15" r="4.6" />
    <circle cx="15" cy="15" r="4.6" />
    <path d="M8.4 6.4 C 10 3.6, 14 3.6, 15.6 6.4" />
    <path d="M10.4 7.6 C 11.2 6.2, 12.8 6.2, 13.6 7.6" />
    <circle cx="12" cy="4.4" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// anniversary — a script heart with an underline flourish.
const Anniversary: G = ({ size }) => (
  <Svg size={size}>
    <path d="M12 18.6 C 7 14.6, 4.6 11.4, 5.6 8.4 C 6.4 6, 9.4 5.4, 12 8.4 C 14.6 5.4, 17.6 6, 18.4 8.4 C 19.4 11.4, 17 14.6, 12 18.6 Z" />
    <path d="M4.4 21 C 9 19.6, 15 19.6, 19.6 21" />
    <circle cx="20.6" cy="20.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// bridal-shower — a hand-tied bouquet.
const BridalShower: G = ({ size }) => (
  <Svg size={size}>
    <path d="M9.6 12.6 L8 20 M14.4 12.6 L16 20 M12 13 V20.6" />
    <path d="M10.2 18.2 H13.8" />
    <circle cx="8.6" cy="9.4" r="2.4" />
    <circle cx="15.4" cy="9.4" r="2.4" />
    <circle cx="12" cy="6.4" r="2.6" />
    <circle cx="12" cy="6.4" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// bridal-luncheon — teacup on a saucer, steam curl.
const BridalLuncheon: G = ({ size }) => (
  <Svg size={size}>
    <path d="M5.6 10.4 H16.4 V13.6 C 16.4 16.4, 14.4 18, 11 18 C 7.6 18, 5.6 16.4, 5.6 13.6 Z" />
    <path d="M16.4 11.4 C 19 11.2, 19.6 14.6, 16.2 15.2" />
    <path d="M4.6 20.4 H17.4" />
    <path d="M10 7.4 C 9.2 6.2, 10.6 5.4, 10 4.2" />
    <circle cx="13.4" cy="5.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// bachelor-party — compass star, gold north pearl.
const BachelorParty: G = ({ size }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 5.4 L13.8 10.2 L18.6 12 L13.8 13.8 L12 18.6 L10.2 13.8 L5.4 12 L10.2 10.2 Z" />
    <circle cx="12" cy="6.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// bachelorette-party — champagne bottle mid-pop, cork flying.
const BacheloretteParty: G = ({ size }) => (
  <Svg size={size}>
    <path d="M10.2 9.4 C 10.2 7.8, 11 7, 11 5.4 L13 5.4 C 13 7, 13.8 7.8, 13.8 9.4 L13.8 19 C 13.8 19.8, 13.2 20.4, 12.4 20.4 L11.6 20.4 C 10.8 20.4, 10.2 19.8, 10.2 19 Z" />
    <path d="M11 5.4 H13" />
    <path d="M16.4 4.6 L18.2 2.8 M17.6 7.2 L19.8 6.6" />
    <circle cx="20.4" cy="3.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// rehearsal-dinner — two coupes mid-clink.
const RehearsalDinner: G = ({ size }) => (
  <Svg size={size}>
    <path d="M4.2 4.8 L9.6 6.6 C 9.4 9.2, 7.8 10.4, 6.2 10 C 4.6 9.6, 3.8 7.8, 4.2 4.8 Z" />
    <path d="M6.6 10.2 L5.4 16.2 M3.6 17.2 L7.2 18" />
    <path d="M19.8 4.8 L14.4 6.6 C 14.6 9.2, 16.2 10.4, 17.8 10 C 19.4 9.6, 20.2 7.8, 19.8 4.8 Z" />
    <path d="M17.4 10.2 L18.6 16.2 M20.4 17.2 L16.8 18" />
    <circle cx="12" cy="4.4" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// welcome-party — bunting strung across.
const WelcomeParty: G = ({ size }) => (
  <Svg size={size}>
    <path d="M3 7 C 8 10.4, 16 10.4, 21 7" />
    <path d="M6.6 9.4 L7.6 13 L9.8 10.2 Z" />
    <path d="M11 10.6 L12 14.2 L14.2 11 Z" />
    <path d="M15.6 10 L17 13.2 L18.8 9.8 Z" />
    <circle cx="21" cy="7" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// brunch — sun rising over a coffee cup.
const Brunch: G = ({ size }) => (
  <Svg size={size}>
    <path d="M7.6 9.6 C 7.6 7, 9.6 5.2, 12 5.2 C 14.4 5.2, 16.4 7, 16.4 9.6" />
    <path d="M12 2.2 V3.4 M5.8 4.6 L6.8 5.6 M18.2 4.6 L17.2 5.6" />
    <path d="M6.4 12.6 H15.6 V15 C 15.6 17.6, 13.8 19, 11 19 C 8.2 19, 6.4 17.6, 6.4 15 Z" />
    <path d="M15.6 13.4 C 18 13.2, 18.4 16.2, 15.4 16.6" />
    <circle cx="12" cy="9.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

/* ── Family & home ───────────────────────────────────────────── */

// baby-shower — a rattle, gold bead at its heart.
const BabyShower: G = ({ size }) => (
  <Svg size={size}>
    <circle cx="9.4" cy="8.4" r="4.6" />
    <path d="M12.8 11.6 L17.8 16.8" />
    <circle cx="18.8" cy="17.8" r="1.6" />
    <path d="M6.6 7 C 7.6 6, 9 5.8, 10.2 6.4" />
    <circle cx="9.4" cy="8.4" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// gender-reveal — a balloon holding its secret.
const GenderReveal: G = ({ size }) => (
  <Svg size={size}>
    <path d="M12 15.4 C 8.2 15.4, 6 12.6, 6 9.4 C 6 5.8, 8.6 3.4, 12 3.4 C 15.4 3.4, 18 5.8, 18 9.4 C 18 12.6, 15.8 15.4, 12 15.4 Z" />
    <path d="M11.2 15.6 L12 17 L12.8 15.6" />
    <path d="M12 17 C 11 18.4, 13 19.6, 12 21" />
    <path d="M10.4 8 C 10.4 6.2, 13.6 6.2, 13.6 8 C 13.6 9.4, 12 9.2, 12 10.6" />
    <circle cx="12" cy="12.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// sip-and-see — a pram with a canopy.
const SipAndSee: G = ({ size }) => (
  <Svg size={size}>
    <path d="M4.6 9.4 H17.4 V11.4 C 17.4 14.4, 15 16.6, 11 16.6 C 7 16.6, 4.6 14.4, 4.6 11.4 Z" />
    <path d="M17.4 9.4 C 17.4 5.8, 14.6 3.4, 11 3.4 V9.4" />
    <path d="M17.4 9.4 L20.4 6.8" />
    <circle cx="7.6" cy="19.4" r="1.7" />
    <circle cx="14.6" cy="19.4" r="1.7" />
    <circle cx="14" cy="6.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// first-birthday — one proud candle on a small cake.
const FirstBirthday: G = ({ size }) => (
  <Svg size={size}>
    <path d="M5.6 20.4 H18.4" />
    <path d="M6.8 20.4 V15.6 C 6.8 14.4, 7.8 13.6, 9 13.6 H15 C 16.2 13.6, 17.2 14.4, 17.2 15.6 V20.4" />
    <path d="M6.8 16.8 C 8.4 18.4, 9.8 16, 12 17.4 C 14.2 18.8, 15.6 15.8, 17.2 17.2" />
    <path d="M12 13.6 V8" />
    <circle cx="12" cy="6.4" r="0.95" fill={GOLD} stroke="none" />
  </Svg>
);

// housewarming — a gabled house, gold light in the window.
const Housewarming: G = ({ size }) => (
  <Svg size={size}>
    <path d="M4.6 11 L12 4.2 L19.4 11" />
    <path d="M6.4 9.6 V19.4 H17.6 V9.6" />
    <path d="M10.4 19.4 V14.4 C 10.4 13.6, 11 13, 11.8 13 H12.2 C 13 13, 13.6 13.6, 13.6 14.4 V19.4" />
    <circle cx="12" cy="8.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

/* ── Milestones ──────────────────────────────────────────────── */

// birthday — tiered cake, three candles, gold flame.
const Birthday: G = ({ size }) => (
  <Svg size={size}>
    <path d="M5 20.4 H19" />
    <path d="M6 20.4 V15.4 H18 V20.4" />
    <path d="M8 15.4 V11.4 H16 V15.4" />
    <path d="M6 17.4 C 8 18.8, 9.4 16.6, 12 18 C 14.6 19.4, 16 17, 18 18.4" />
    <path d="M9.4 11.4 V9 M12 11.4 V8.4 M14.6 11.4 V9" />
    <circle cx="12" cy="6.8" r="0.95" fill={GOLD} stroke="none" />
  </Svg>
);

// milestone-birthday — a laurel-framed plinth.
const MilestoneBirthday: G = ({ size }) => (
  <Svg size={size}>
    <path d="M5.4 19.6 C 3.6 15.4, 4.2 9.6, 7.6 6.2" />
    <path d="M18.6 19.6 C 20.4 15.4, 19.8 9.6, 16.4 6.2" />
    <path d="M5.8 16.6 L7.8 15.8 M5 13 L7.2 12.8 M5.6 9.4 L7.6 10" />
    <path d="M18.2 16.6 L16.2 15.8 M19 13 L16.8 12.8 M18.4 9.4 L16.4 10" />
    <path d="M9.4 16.4 H14.6 M10.2 16.4 V11.2 H13.8 V16.4" />
    <circle cx="12" cy="7.6" r="1" fill={GOLD} stroke="none" />
  </Svg>
);

// sweet-sixteen — a shooting star, twin trails.
const SweetSixteen: G = ({ size }) => (
  <Svg size={size}>
    <path d="M15.4 5.2 L16.6 8.4 L19.8 9.6 L16.6 10.8 L15.4 14 L14.2 10.8 L11 9.6 L14.2 8.4 Z" />
    <path d="M11.4 12.8 C 8.8 15, 6.2 17, 3.6 18.4" />
    <path d="M13.4 15 C 11.6 16.8, 9.6 18.4, 7.6 19.8" />
    <circle cx="15.4" cy="9.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// graduation — mortarboard, gold tassel end.
const Graduation: G = ({ size }) => (
  <Svg size={size}>
    <path d="M2.8 9.8 L12 5.4 L21.2 9.8 L12 14.2 Z" />
    <path d="M6.8 12.2 V16.4 C 6.8 18, 9.2 19.2, 12 19.2 C 14.8 19.2, 17.2 18, 17.2 16.4 V12.2" />
    <path d="M21.2 9.8 V14.6" />
    <circle cx="21.2" cy="15.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// retirement — a pocket watch on its chain.
const Retirement: G = ({ size }) => (
  <Svg size={size}>
    <circle cx="12" cy="13.4" r="6.6" />
    <path d="M12 9.6 V13.4 L14.8 15" />
    <path d="M10.6 5 H13.4 M12 5 V6.8" />
    <path d="M14.6 4.8 C 16.2 3.6, 18.2 3.8, 19.4 5" />
    <circle cx="20.2" cy="5.8" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// story — an open book, gold bookmark dot.
const Story: G = ({ size }) => (
  <Svg size={size}>
    <path d="M12 6.4 C 10 4.8, 6.8 4.4, 4 5.2 V18 C 6.8 17.2, 10 17.6, 12 19.2 C 14 17.6, 17.2 17.2, 20 18 V5.2 C 17.2 4.4, 14 4.8, 12 6.4 Z" />
    <path d="M12 6.4 V19.2" />
    <path d="M6.4 8.6 C 7.8 8.2, 9.4 8.4, 10.4 9 M6.4 11.6 C 7.8 11.2, 9.4 11.4, 10.4 12" />
    <circle cx="16.4" cy="8" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

/* ── Cultural ────────────────────────────────────────────────── */

// bar-mitzvah — Star of David, hand-drawn weight.
const BarMitzvah: G = ({ size }) => (
  <Svg size={size}>
    <path d="M12 3.8 L19 16 H5 Z" />
    <path d="M12 20.2 L5 8 H19 Z" />
    <circle cx="12" cy="12" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// bat-mitzvah — an open scroll between two rollers.
const BatMitzvah: G = ({ size }) => (
  <Svg size={size}>
    <path d="M7.4 5.4 V18.6 M5.4 4.4 C 5.4 5.6, 9.4 5.6, 9.4 4.4 M5.4 19.6 C 5.4 18.4, 9.4 18.4, 9.4 19.6" />
    <path d="M16.6 5.4 V18.6 M14.6 4.4 C 14.6 5.6, 18.6 5.6, 18.6 4.4 M14.6 19.6 C 14.6 18.4, 18.6 18.4, 18.6 19.6" />
    <path d="M9.4 7.4 H14.6 M9.4 10.4 H14.6 M9.4 13.4 H14.6 M9.4 16.4 H12.6" />
    <circle cx="14.6" cy="16.4" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// quinceanera — a five-point tiara on its band.
const Quinceanera: G = ({ size }) => (
  <Svg size={size}>
    <path d="M4.4 16.6 L5.4 9.4 L8.6 12.6 L12 7 L15.4 12.6 L18.6 9.4 L19.6 16.6 Z" />
    <path d="M4.8 18.8 H19.2" />
    <circle cx="12" cy="4.8" r="1" fill={GOLD} stroke="none" />
  </Svg>
);

// baptism — a scallop shell shedding three drops.
const Baptism: G = ({ size }) => (
  <Svg size={size}>
    <path d="M5.4 10.6 C 5.4 6.6, 8.4 3.8, 12 3.8 C 15.6 3.8, 18.6 6.6, 18.6 10.6 L12 13.4 Z" />
    <path d="M8.2 10.2 L10 5 M12 13 L12 4.2 M15.8 10.2 L14 5" />
    <path d="M8.6 16.4 C 8 17.4, 9.2 18.2, 8.6 19.2 M15.4 16.4 C 14.8 17.4, 16 18.2, 15.4 19.2" />
    <path d="M12 16.8 C 11.4 17.8, 12.6 18.6, 12 19.6" />
    <circle cx="12" cy="8.4" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// first-communion — chalice beneath a host.
const FirstCommunion: G = ({ size }) => (
  <Svg size={size}>
    <circle cx="12" cy="5.6" r="2.6" />
    <path d="M10.9 5.6 H13.1 M12 4.5 V6.7" strokeWidth="1.1" />
    <path d="M6.8 10.2 H17.2 C 17.2 13.6, 15 15.8, 12 15.8 C 9 15.8, 6.8 13.6, 6.8 10.2 Z" />
    <path d="M12 15.8 V19 M9.2 20.2 H14.8" />
    <circle cx="17.8" cy="10.2" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

// confirmation — a descending dove.
const Confirmation: G = ({ size }) => (
  <Svg size={size}>
    <path d="M13.6 8.2 C 15.8 6.4, 18.8 6.6, 20.4 8.6 C 17.6 9, 16 10.4, 15 12.6 C 13.8 15.2, 11 16.8, 7.6 16.4 L4 19 C 4.6 14.8, 6.4 11.6, 9.6 9.8 C 10.8 9.2, 12.2 8.6, 13.6 8.2 Z" />
    <path d="M13 12.4 C 14.6 12.8, 16.2 12.6, 17.6 11.8" />
    <circle cx="18" cy="7.2" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

/* ── Commemoration & community ───────────────────────────────── */

// memorial — an olive bough, one gold fruit.
const Memorial: G = ({ size }) => (
  <Svg size={size}>
    <path d="M5 19.6 C 8.4 15.2, 12.6 10.4, 19 5" />
    <path d="M9.6 14.6 C 8.6 13, 8.8 11.2, 10.2 9.8 C 11.2 11.6, 11 13.4, 9.6 14.6 Z" />
    <path d="M13.4 10.8 C 12.4 9.2, 12.6 7.4, 14 6 C 15 7.8, 14.8 9.6, 13.4 10.8 Z" />
    <path d="M11.4 13.2 C 13 14.2, 14.8 14, 16.2 12.6 C 14.4 11.6, 12.6 11.8, 11.4 13.2 Z" />
    <circle cx="7.2" cy="16.6" r="1" fill={GOLD} stroke="none" />
  </Svg>
);

// funeral — a single candle, still gold flame, soft halo.
const Funeral: G = ({ size }) => (
  <Svg size={size}>
    <path d="M10.4 11.4 H13.6 V19.6 H10.4 Z" />
    <path d="M8 21.2 H16" />
    <path d="M7.6 7.4 C 8.6 5, 10 3.6, 12 3 M16.4 7.4 C 15.4 5, 14 3.6, 12 3" opacity="0.45" />
    <circle cx="12" cy="8.6" r="1" fill={GOLD} stroke="none" />
  </Svg>
);

// reunion — three figures arm in arm.
const Reunion: G = ({ size }) => (
  <Svg size={size}>
    <circle cx="6.6" cy="9.2" r="2.1" />
    <circle cx="12" cy="7.6" r="2.3" />
    <circle cx="17.4" cy="9.2" r="2.1" />
    <path d="M3.6 18.4 C 4 15.4, 5.2 13.6, 6.6 13.6 C 7.6 13.6, 8.4 14.4, 9 15.6" />
    <path d="M20.4 18.4 C 20 15.4, 18.8 13.6, 17.4 13.6 C 16.4 13.6, 15.6 14.4, 15 15.6" />
    <path d="M8.6 19.4 C 9 15.8, 10.2 13.8, 12 13.8 C 13.8 13.8, 15 15.8, 15.4 19.4" />
    <circle cx="12" cy="7.6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

/* ── Fallback ────────────────────────────────────────────────── */

const Sparkle: G = ({ size }) => (
  <Svg size={size}>
    <path d="M12 4 C 12.8 8.4, 15.6 11.2, 20 12 C 15.6 12.8, 12.8 15.6, 12 20 C 11.2 15.6, 8.4 12.8, 4 12 C 8.4 11.2, 11.2 8.4, 12 4 Z" />
    <circle cx="18" cy="6" r="0.9" fill={GOLD} stroke="none" />
  </Svg>
);

/* One unique mark per occasion id. */
const GLYPHS: Record<string, G> = {
  wedding: Wedding,
  engagement: Engagement,
  'vow-renewal': VowRenewal,
  anniversary: Anniversary,
  'bridal-shower': BridalShower,
  'bridal-luncheon': BridalLuncheon,
  'bachelor-party': BachelorParty,
  'bachelorette-party': BacheloretteParty,
  'rehearsal-dinner': RehearsalDinner,
  'welcome-party': WelcomeParty,
  brunch: Brunch,
  'baby-shower': BabyShower,
  'gender-reveal': GenderReveal,
  'sip-and-see': SipAndSee,
  'first-birthday': FirstBirthday,
  housewarming: Housewarming,
  birthday: Birthday,
  'milestone-birthday': MilestoneBirthday,
  'sweet-sixteen': SweetSixteen,
  graduation: Graduation,
  retirement: Retirement,
  story: Story,
  'bar-mitzvah': BarMitzvah,
  'bat-mitzvah': BatMitzvah,
  quinceanera: Quinceanera,
  baptism: Baptism,
  'first-communion': FirstCommunion,
  confirmation: Confirmation,
  memorial: Memorial,
  funeral: Funeral,
  reunion: Reunion,
};
