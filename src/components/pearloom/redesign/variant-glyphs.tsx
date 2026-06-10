'use client';

/* variant-glyphs — theme-aware mini-previews for the Layout tab.

   Each entry in VARIANT_GLYPHS is a tiny abstract composition
   (rects / lines / circles on a 56×40 canvas) sketching what the
   variant's real layout does: 'tickets' = stub rects with a dashed
   edge, 'centerline' = a center rail with alternating dashes,
   'circle' = three round portraits, etc.

   THEME-AWARENESS — every color in a sketch is a live token read:
     · `currentColor`            → ink   (wrapper sets var(--t-ink))
     · `var(--t-accent, …)`      → theme accent
     · `var(--t-accent-bg, …)`   → accent wash (photo plates)
     · `var(--t-gold, …)`        → gold punctuation
     · `var(--t-line, …)`        → hairlines
     · `var(--t-paper/-card, …)` → tile ground
   PropertyRail's Layout tab paints the live theme's --t-* bag
   (getTheme(themeId).vars + manifest.themeVars pack override) on
   the picker container, so the sketches re-color instantly when
   the host applies a different theme or store pack. The hex
   fallbacks are the 'garden' default so the registry still reads
   if mounted outside a themed scope.

   Keyed `${section}/${variantId}` — ids match layouts.ts. Misses
   fall back to a generic three-bar sketch in <VariantGlyph />. */

import type { CSSProperties, ReactNode } from 'react';
import type { SectionId } from './EditorRedesign';

/* Live theme token reads (garden-theme fallbacks). */
const A  = 'var(--t-accent, #B7A4D0)';
const AB = 'var(--t-accent-bg, #E8E0F0)';
const G  = 'var(--t-gold, #B89244)';
const L  = 'var(--t-line, rgba(61,74,31,0.22))';
const CARD = 'var(--t-card, #FFFEF7)';

/* ── Sketch primitives ──────────────────────────────────────── */

/** Text bar — ink by default. */
function B({ x, y, w, h = 2.2, f = 'currentColor', o = 1, rx = 1 }: { x: number; y: number; w: number; h?: number; f?: string; o?: number; rx?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill={f} opacity={o} />;
}
/** Photo / wash plate — accent-tinted block. */
function P({ x, y, w, h, f = A, o = 0.55, rx = 1.5 }: { x: number; y: number; w: number; h: number; f?: string; o?: number; rx?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill={f} opacity={o} />;
}
/** Card — paper plate with a hairline ring. */
function Card({ x, y, w, h, rx = 2 }: { x: number; y: number; w: number; h: number; rx?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill={CARD} stroke={L} strokeWidth="0.7" />;
}
/** Gold dot — punctuation. */
function D({ cx, cy, r = 1.7, f = G }: { cx: number; cy: number; r?: number; f?: string }) {
  return <circle cx={cx} cy={cy} r={r} fill={f} />;
}
/** Hairline. */
function Ln({ x1, y1, x2, y2, dash, f = L, w = 0.8 }: { x1: number; y1: number; x2: number; y2: number; dash?: string; f?: string; w?: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={f} strokeWidth={w} strokeDasharray={dash} />;
}

/* Shared sketches — several sections use the same honest shape. */

/** Vertical rail + dots + bars — story/schedule 'timeline', itinerary 'flow'. */
const TIMELINE = (
  <>
    <Ln x1={12} y1={6} x2={12} y2={34} />
    <D cx={12} cy={9} r={2} f={A} /><B x={18} y={8} w={24} /><B x={18} y={12} w={16} o={0.45} />
    <D cx={12} cy={20} r={2} f={A} /><B x={18} y={19} w={28} /><B x={18} y={23} w={14} o={0.45} />
    <D cx={12} cy={31} r={2} f={G} /><B x={18} y={30} w={20} />
  </>
);

/** Index-style rows with leading gold numerals — 'numbered' everywhere. */
const NUMBERED = (
  <>
    <B x={8} y={8} w={3} h={3.2} f={G} /><B x={15} y={8.5} w={30} /><Ln x1={8} y1={15} x2={48} y2={15} />
    <B x={8} y={19} w={3} h={3.2} f={G} /><B x={15} y={19.5} w={24} /><Ln x1={8} y1={26} x2={48} y2={26} />
    <B x={8} y={30} w={3} h={3.2} f={G} /><B x={15} y={30.5} w={27} />
  </>
);

/** Stacked divided rows — 'accordion' (details + faq). */
const ACCORDION = (
  <>
    <B x={8} y={8} w={28} /><B x={45} y={7.5} w={3} h={3} f={G} /><Ln x1={8} y1={14.5} x2={48} y2={14.5} />
    <B x={8} y={19} w={24} /><B x={45} y={18.5} w={3} h={3} f={G} /><Ln x1={8} y1={25.5} x2={48} y2={25.5} />
    <B x={8} y={30} w={30} /><B x={45} y={29.5} w={3} h={3} f={G} />
  </>
);

/** Even card grid — adviceWall/faq 'cards'. */
const CARD_GRID = (
  <>
    <Card x={7} y={7} w={20} h={12} /><B x={10} y={11} w={13} h={1.8} o={0.7} />
    <Card x={30} y={7} w={20} h={12} /><B x={33} y={11} w={11} h={1.8} o={0.7} />
    <Card x={7} y={22} w={20} h={12} /><B x={10} y={26} w={11} h={1.8} o={0.7} />
    <Card x={30} y={22} w={20} h={12} /><B x={33} y={26} w={13} h={1.8} o={0.7} />
  </>
);

/* ── The registry ───────────────────────────────────────────── */

export const VARIANT_GLYPHS: Record<string, ReactNode> = {
  /* hero */
  'hero/centered': (
    <><B x={14} y={11} w={28} h={3.4} /><B x={18} y={18} w={20} o={0.5} /><D cx={28} cy={26} /><B x={21} y={30} w={14} h={3} f={A} rx={1.5} /></>
  ),
  'hero/split': (
    <><B x={7} y={11} w={18} h={3} /><B x={7} y={17} w={14} o={0.5} /><B x={7} y={21} w={16} o={0.5} /><B x={7} y={27} w={11} h={3} f={A} rx={1.5} /><P x={31} y={6} w={19} h={28} /></>
  ),
  'hero/minimal': (
    <><B x={8} y={12} w={26} h={3.4} /><B x={8} y={20} w={18} o={0.5} /><B x={8} y={25} w={21} o={0.5} /><D cx={9.5} cy={32} /></>
  ),
  'hero/fullbleed': (
    <><P x={4} y={4} w={48} h={32} o={0.75} /><B x={18} y={17} w={20} h={3} f={CARD} /><B x={22} y={23} w={12} f={CARD} o={0.8} /></>
  ),
  'hero/typographic': (
    <><B x={8} y={7} w={40} h={6.5} /><D cx={28} cy={19.5} /><B x={8} y={24} w={40} h={6.5} /></>
  ),
  'hero/postcard': (
    <><P x={4} y={4} w={48} h={32} f={AB} o={1} rx={0} /><Card x={11} y={9} w={34} h={22} /><Ln x1={14} y1={12} x2={42} y2={12} /><Ln x1={14} y1={28} x2={42} y2={28} /><B x={19} y={16} w={18} h={2.6} /><B x={23} y={22} w={10} o={0.5} /></>
  ),

  /* story */
  'story/sidebyside': (
    <><P x={6} y={6} w={18} h={28} /><B x={29} y={9} w={18} h={2.6} /><B x={29} y={15} w={20} o={0.5} /><B x={29} y={19} w={17} o={0.5} /><B x={29} y={23} w={19} o={0.5} /><B x={29} y={27} w={12} o={0.5} /></>
  ),
  'story/stacked': (
    <><P x={8} y={5} w={40} h={15} /><B x={8} y={24} w={26} h={2.6} /><B x={8} y={29.5} w={38} o={0.5} /><B x={8} y={33} w={28} o={0.5} /></>
  ),
  'story/quote': (
    <><B x={13} y={7} w={6} h={5} f={G} o={0.85} rx={2} /><B x={12} y={16} w={32} h={2.6} /><B x={16} y={22} w={24} h={2.6} /><B x={20} y={28} w={16} o={0.5} /></>
  ),
  'story/timeline': TIMELINE,
  'story/zigzag': (
    <><P x={6} y={5} w={16} h={12} /><B x={26} y={8} w={20} /><B x={26} y={12} w={14} o={0.5} /><B x={8} y={25} w={18} /><B x={8} y={29} w={12} o={0.5} /><P x={32} y={22} w={16} h={12} /></>
  ),
  'story/letter': (
    <><Card x={9} y={5} w={38} h={30} /><B x={14} y={10} w={20} o={0.5} /><B x={14} y={15} w={28} o={0.5} /><B x={14} y={19} w={26} o={0.5} /><B x={14} y={23} w={28} o={0.5} /><path d="M30 30 q3 -3.5 6 0 t8 0" fill="none" stroke={G} strokeWidth="1.2" /></>
  ),

  /* details */
  'details/tiles': (
    <><Card x={6} y={10} w={13} h={20} /><D cx={12.5} cy={16} f={G} /><B x={9} y={22} w={7} h={1.8} o={0.6} /><Card x={21.5} y={10} w={13} h={20} /><D cx={28} cy={16} f={G} /><B x={24.5} y={22} w={7} h={1.8} o={0.6} /><Card x={37} y={10} w={13} h={20} /><D cx={43.5} cy={16} f={G} /><B x={40} y={22} w={7} h={1.8} o={0.6} /></>
  ),
  'details/iconrow': (
    <><D cx={13} cy={13} r={3.2} f={G} /><B x={8} y={21} w={10} h={1.8} o={0.6} /><D cx={28} cy={13} r={3.2} f={G} /><B x={23} y={21} w={10} h={1.8} o={0.6} /><D cx={43} cy={13} r={3.2} f={G} /><B x={38} y={21} w={10} h={1.8} o={0.6} /><B x={18} y={28} w={20} o={0.4} /></>
  ),
  'details/accordion': ACCORDION,
  'details/bento': (
    <><Card x={6} y={6} w={27} h={28} /><B x={10} y={12} w={16} h={2.4} /><B x={10} y={18} w={18} o={0.5} /><Card x={36} y={6} w={14} h={13} /><D cx={43} cy={12.5} f={G} /><Card x={36} y={21} w={14} h={13} /><D cx={43} cy={27.5} f={A} /></>
  ),

  /* schedule */
  'schedule/cards': (
    <><Card x={5} y={11} w={10} h={18} /><B x={7} y={14} w={6} h={1.8} f={G} /><B x={7} y={20} w={6} h={1.6} o={0.6} /><Card x={17} y={11} w={10} h={18} /><B x={19} y={14} w={6} h={1.8} f={G} /><B x={19} y={20} w={6} h={1.6} o={0.6} /><Card x={29} y={11} w={10} h={18} /><B x={31} y={14} w={6} h={1.8} f={G} /><B x={31} y={20} w={6} h={1.6} o={0.6} /><Card x={41} y={11} w={10} h={18} /><B x={43} y={14} w={6} h={1.8} f={G} /><B x={43} y={20} w={6} h={1.6} o={0.6} /></>
  ),
  'schedule/timeline': TIMELINE,
  'schedule/stepper': (
    <><Ln x1={10} y1={20} x2={46} y2={20} /><circle cx={12} cy={20} r={3.4} fill={A} /><circle cx={28} cy={20} r={3.4} fill={A} opacity={0.65} /><circle cx={44} cy={20} r={3.4} fill={CARD} stroke={L} strokeWidth="0.8" /><B x={8} y={28} w={8} h={1.6} o={0.55} /><B x={24} y={28} w={8} h={1.6} o={0.55} /><B x={40} y={28} w={8} h={1.6} o={0.55} /></>
  ),
  'schedule/numbered': NUMBERED,

  /* travel */
  'travel/map': (
    <><P x={6} y={6} w={26} h={28} f={AB} o={1} /><Ln x1={8} y1={14} x2={30} y2={20} f={L} /><Ln x1={12} y1={32} x2={26} y2={9} f={L} /><D cx={19} cy={19} r={2.6} f={A} /><Card x={36} y={6} w={14} h={12.5} /><B x={38} y={14} w={9} h={1.6} o={0.6} /><Card x={36} y={21.5} w={14} h={12.5} /><B x={38} y={29.5} w={9} h={1.6} o={0.6} /></>
  ),
  'travel/rows': (
    <><Card x={6} y={6} w={44} h={13} /><P x={8} y={8} w={11} h={9} /><B x={23} y={10} w={16} h={2} /><B x={23} y={14} w={11} h={1.6} o={0.5} /><Card x={6} y={21} w={44} h={13} /><P x={8} y={23} w={11} h={9} /><B x={23} y={25} w={14} h={2} /><B x={23} y={29} w={12} h={1.6} o={0.5} /></>
  ),
  'travel/table': (
    <><Ln x1={6} y1={11} x2={50} y2={11} w={1.1} f="currentColor" /><B x={6} y={6} w={12} h={2} /><B x={26} y={6} w={8} h={2} o={0.6} /><B x={40} y={6} w={8} h={2} o={0.6} /><Ln x1={6} y1={19} x2={50} y2={19} /><B x={6} y={14.5} w={14} h={1.8} o={0.7} /><D cx={30} cy={15.5} r={1.4} /><B x={40} y={14.5} w={6} h={1.8} f={G} /><Ln x1={6} y1={27} x2={50} y2={27} /><B x={6} y={22.5} w={11} h={1.8} o={0.7} /><D cx={30} cy={23.5} r={1.4} /><B x={40} y={22.5} w={6} h={1.8} f={G} /><B x={6} y={30.5} w={13} h={1.8} o={0.7} /></>
  ),
  'travel/carousel': (
    <><Card x={2} y={9} w={12} h={22} /><Card x={17} y={7} w={22} h={26} /><P x={19} y={9} w={18} h={13} /><B x={21} y={26} w={13} h={1.8} o={0.7} /><Card x={42} y={9} w={12} h={22} /></>
  ),

  /* registry */
  'registry/cards': (
    <><B x={13} y={8} w={30} o={0.5} /><B x={17} y={12} w={22} o={0.5} /><Card x={8} y={20} w={12} h={12} /><Card x={22} y={20} w={12} h={12} /><Card x={36} y={20} w={12} h={12} /><D cx={14} cy={26} f={G} /><D cx={28} cy={26} f={G} /><D cx={42} cy={26} f={G} /></>
  ),
  'registry/chips': (
    <><B x={9} y={12} w={13} h={5} rx={2.5} f={AB} /><B x={25} y={12} w={16} h={5} rx={2.5} f={AB} /><B x={13} y={21} w={15} h={5} rx={2.5} f={AB} /><B x={31} y={21} w={12} h={5} rx={2.5} f={AB} /></>
  ),
  'registry/progress': (
    <><B x={14} y={9} w={28} o={0.6} /><rect x={8} y={17} width={40} height={6} rx={3} fill={AB} /><rect x={8} y={17} width={26} height={6} rx={3} fill={A} /><D cx={34} cy={20} r={2.2} /><B x={20} y={29} w={16} h={1.8} o={0.5} /></>
  ),
  'registry/logowall': (
    <><Card x={7} y={9} w={12} h={10} /><Card x={22} y={9} w={12} h={10} /><Card x={37} y={9} w={12} h={10} /><Card x={7} y={22} w={12} h={10} /><Card x={22} y={22} w={12} h={10} /><Card x={37} y={22} w={12} h={10} /><B x={10} y={13} w={6} h={2} o={0.4} /><B x={25} y={13} w={6} h={2} o={0.4} /><B x={40} y={13} w={6} h={2} o={0.4} /><B x={10} y={26} w={6} h={2} o={0.4} /><B x={25} y={26} w={6} h={2} o={0.4} /><B x={40} y={26} w={6} h={2} o={0.4} /></>
  ),

  /* gallery */
  'gallery/grid': (
    <><P x={6} y={6} w={14} h={13} /><P x={21} y={6} w={14} h={13} o={0.4} /><P x={36} y={6} w={14} h={13} o={0.7} /><P x={6} y={21} w={14} h={13} o={0.4} /><P x={21} y={21} w={14} h={13} o={0.7} /><P x={36} y={21} w={14} h={13} /></>
  ),
  'gallery/masonry': (
    <><P x={6} y={6} w={14} h={17} /><P x={6} y={25} w={14} h={9} o={0.4} /><P x={21} y={6} w={14} h={10} o={0.6} /><P x={21} y={18} w={14} h={16} /><P x={36} y={6} w={14} h={14} o={0.4} /><P x={36} y={22} w={14} h={12} o={0.7} /></>
  ),
  'gallery/slideshow': (
    <><P x={6} y={5} w={44} h={22} /><P x={9} y={30} w={9} h={6} o={0.9} /><P x={20} y={30} w={9} h={6} o={0.45} /><P x={31} y={30} w={9} h={6} o={0.45} /><P x={42} y={30} w={6} h={6} o={0.45} /></>
  ),
  'gallery/polaroid': (
    <><g transform="rotate(-6 16 18)"><Card x={7} y={8} w={17} h={19} /><P x={9} y={10} w={13} h={12} /></g><g transform="rotate(5 38 22)"><Card x={30} y={12} w={17} h={19} /><P x={32} y={14} w={13} h={12} /></g></>
  ),

  /* faq */
  'faq/accordion': ACCORDION,
  'faq/twocol': (
    <><B x={7} y={8} w={18} h={2.4} /><B x={7} y={14} w={16} o={0.5} /><B x={7} y={18} w={14} o={0.5} /><B x={31} y={8} w={18} h={2.4} /><B x={31} y={14} w={15} o={0.5} /><B x={31} y={18} w={17} o={0.5} /><B x={7} y={26} w={17} h={2.4} /><B x={7} y={31.5} w={14} o={0.5} /><B x={31} y={26} w={16} h={2.4} /><B x={31} y={31.5} w={15} o={0.5} /></>
  ),
  'faq/numbered': NUMBERED,
  'faq/cards': CARD_GRID,

  /* rsvp */
  'rsvp/centered': (
    <><rect x={6} y={5} width={44} height={30} rx={2.5} fill="var(--t-rsvp, currentColor)" opacity={0.85} /><B x={18} y={12} w={20} h={2.6} f={CARD} /><B x={14} y={19} w={28} h={3.4} f={CARD} o={0.35} rx={1.7} /><B x={21} y={26} w={14} h={4} f={G} rx={2} /></>
  ),
  'rsvp/split': (
    <><P x={6} y={5} w={19} h={30} /><B x={30} y={9} w={16} h={2.4} /><B x={30} y={15} w={18} h={3} o={0.3} rx={1.5} /><B x={30} y={20} w={18} h={3} o={0.3} rx={1.5} /><B x={30} y={27} w={12} h={3.6} f={A} rx={1.8} /></>
  ),
  'rsvp/banner': (
    <><rect x={4} y={12} width={48} height={11} rx={2} fill={AB} /><B x={8} y={16.5} w={18} h={2.4} /><B x={37} y={15} w={11} h={5} f={A} rx={2.5} /><B x={10} y={29} w={36} o={0.25} /><B x={10} y={33} w={28} o={0.25} /></>
  ),
  'rsvp/minimal': (
    <><B x={16} y={11} w={24} o={0.4} /><B x={19} y={18} w={18} h={5.5} f={A} rx={2.7} /><B x={22} y={28} w={12} o={0.4} /></>
  ),

  /* nav */
  'nav/centered': (
    <><Ln x1={4} y1={28} x2={52} y2={28} /><B x={7} y={17} w={8} h={1.8} o={0.6} /><B x={17} y={17} w={8} h={1.8} o={0.6} /><D cx={28} cy={17.5} r={2.6} f={A} /><B x={31} y={17} w={8} h={1.8} o={0.6} /><B x={41} y={17} w={8} h={1.8} o={0.6} /></>
  ),
  'nav/split': (
    <><Ln x1={4} y1={28} x2={52} y2={28} /><D cx={9} cy={17.5} r={2.6} f={A} /><B x={20} y={17} w={7} h={1.8} o={0.6} /><B x={29} y={17} w={7} h={1.8} o={0.6} /><B x={39} y={14.5} w={10} h={5.5} f={A} rx={2.7} /></>
  ),
  'nav/serif-block': (
    <><B x={7} y={9} w={24} h={4.6} /><B x={7} y={19} w={7} h={1.6} o={0.5} /><B x={16} y={19} w={7} h={1.6} o={0.5} /><B x={25} y={19} w={7} h={1.6} o={0.5} /><Ln x1={4} y1={27} x2={52} y2={27} /></>
  ),
  'nav/minimal-text': (
    <><B x={10} y={18} w={8} h={1.8} o={0.7} /><B x={21} y={18} w={8} h={1.8} o={0.7} /><B x={32} y={18} w={8} h={1.8} o={0.7} /><B x={43} y={18} w={5} h={1.8} o={0.7} /></>
  ),
  'nav/iconic': (
    <><D cx={11} cy={18} r={3.4} f={G} /><Ln x1={18} y1={18} x2={48} y2={18} /><D cx={26} cy={18} r={1.2} f="currentColor" /><D cx={34} cy={18} r={1.2} f="currentColor" /><D cx={42} cy={18} r={1.2} f="currentColor" /></>
  ),

  /* navMobile */
  'navMobile/overlay': (
    <><rect x={14} y={4} width={28} height={32} rx={2.5} fill={AB} /><B x={22} y={12} w={12} h={2} /><B x={24} y={18} w={8} h={2} o={0.6} /><B x={23} y={24} w={10} h={2} o={0.6} /></>
  ),
  'navMobile/slide-in': (
    <><rect x={14} y={4} width={28} height={32} rx={2.5} fill={CARD} stroke={L} strokeWidth="0.7" /><rect x={28} y={4} width={14} height={32} rx={2.5} fill={AB} /><B x={31} y={11} w={8} h={1.8} /><B x={31} y={16} w={6} h={1.8} o={0.6} /><B x={31} y={21} w={7} h={1.8} o={0.6} /></>
  ),
  'navMobile/bottom-sheet': (
    <><rect x={14} y={4} width={28} height={32} rx={2.5} fill={CARD} stroke={L} strokeWidth="0.7" /><rect x={14} y={20} width={28} height={16} rx={2.5} fill={AB} /><B x={25} y={23} w={6} h={1.4} rx={0.7} o={0.4} /><B x={20} y={27} w={12} h={1.8} /><B x={20} y={31} w={9} h={1.8} o={0.6} /></>
  ),
  'navMobile/pill': (
    <><rect x={14} y={4} width={28} height={32} rx={2.5} fill={CARD} stroke={L} strokeWidth="0.7" /><B x={19} y={28} w={18} h={5.5} f={A} rx={2.7} /><D cx={24} cy={30.7} r={1.2} f={CARD} /><B x={28} y={30} w={6} h={1.4} f={CARD} o={0.8} /></>
  ),

  /* countdown */
  'countdown/cards': (
    <><Card x={5} y={11} w={10} h={16} /><B x={7.5} y={14} w={5} h={4.5} f={A} /><Card x={17} y={11} w={10} h={16} /><B x={19.5} y={14} w={5} h={4.5} f={A} /><Card x={29} y={11} w={10} h={16} /><B x={31.5} y={14} w={5} h={4.5} f={A} /><Card x={41} y={11} w={10} h={16} /><B x={43.5} y={14} w={5} h={4.5} f={A} /></>
  ),
  'countdown/stripe': (
    <><rect x={4} y={15} width={48} height={10} fill={AB} /><B x={9} y={18.5} w={5} h={3} f={A} /><D cx={18} cy={20} r={1} /><B x={22} y={18.5} w={5} h={3} f={A} /><D cx={31} cy={20} r={1} /><B x={35} y={18.5} w={5} h={3} f={A} /><D cx={44} cy={20} r={1} /></>
  ),
  'countdown/minimal': (
    <><B x={18} y={10} w={20} h={8} /><B x={21} y={24} w={14} o={0.5} /></>
  ),
  'countdown/hero': (
    <><B x={6} y={8} w={13} h={13} /><B x={21.5} y={8} w={13} h={13} o={0.8} /><B x={37} y={8} w={13} h={13} o={0.6} /><B x={17} y={27} w={22} o={0.45} /></>
  ),
  'countdown/ribbon': (
    <><g transform="rotate(-8 28 20)"><rect x={0} y={15} width={56} height={9} fill={A} opacity={0.8} /><B x={18} y={18} w={20} h={2.6} f={CARD} /></g></>
  ),
  'countdown/flip': (
    <><Card x={11} y={9} w={15} h={20} rx={2.5} /><B x={15} y={14} w={7} h={5} f={A} /><Ln x1={11} y1={19} x2={26} y2={19} w={1} /><Card x={30} y={9} w={15} h={20} rx={2.5} /><B x={34} y={14} w={7} h={5} f={A} /><Ln x1={30} y1={19} x2={45} y2={19} w={1} /></>
  ),

  /* map */
  'map/embed': (
    <><P x={5} y={5} w={46} h={30} f={AB} o={1} /><Ln x1={8} y1={13} x2={50} y2={22} /><Ln x1={16} y1={35} x2={32} y2={5} /><D cx={28} cy={19} r={3} f={A} /><circle cx={28} cy={19} r={1.1} fill={CARD} /></>
  ),
  'map/static': (
    <><P x={5} y={5} w={46} h={30} f={AB} o={1} /><Ln x1={8} y1={14} x2={50} y2={20} dash="2.5 2" /><Ln x1={18} y1={35} x2={30} y2={5} dash="2.5 2" /><D cx={28} cy={19} r={2.6} f={A} /></>
  ),
  'map/pin': (
    <><Card x={10} y={7} w={36} h={26} /><D cx={28} cy={15} r={3.2} f={A} /><path d="M28 18 l-2.4 4.6 h4.8 z" fill={A} /><B x={20} y={26.5} w={16} h={3.4} f={G} rx={1.7} /></>
  ),
  'map/split': (
    <><P x={6} y={6} w={22} h={28} f={AB} o={1} /><D cx={17} cy={18} r={2.4} f={A} /><B x={33} y={10} w={14} h={2.4} /><B x={33} y={16} w={15} o={0.5} /><B x={33} y={20} w={12} o={0.5} /><B x={33} y={26} w={10} h={3} f={A} rx={1.5} /></>
  ),
  'map/postcard': (
    <><g transform="rotate(-4 28 20)"><Card x={8} y={7} w={40} h={26} /><P x={11} y={10} w={26} h={20} f={AB} o={1} /><D cx={24} cy={19} r={2.2} f={A} /><rect x={40} y={10} width={5.5} height={6.5} fill={G} opacity={0.8} rx={0.8} /></g></>
  ),

  /* music */
  'music/card': (
    <><Card x={8} y={8} w={40} h={24} /><path d="M16 16 l7 4 -7 4 z" fill={A} /><B x={27} y={16} w={15} h={2.2} /><B x={27} y={21} w={11} o={0.5} /></>
  ),
  'music/minimal': (
    <><path d="M16 14 l8.5 6 -8.5 6 z" fill={A} /><B x={29} y={16} w={15} h={2.2} /><B x={29} y={21} w={11} o={0.5} /></>
  ),
  'music/fullbleed': (
    <><P x={4} y={9} w={48} h={22} o={0.7} /><path d="M24 15 l8 5 -8 5 z" fill={CARD} /></>
  ),
  'music/sidebar': (
    <><Card x={6} y={7} w={20} h={26} /><path d="M13 16 l6.5 4 -6.5 4 z" fill={A} /><B x={31} y={10} w={16} h={2.4} /><B x={31} y={16} w={18} o={0.5} /><B x={31} y={20} w={14} o={0.5} /><B x={31} y={24} w={16} o={0.5} /></>
  ),
  'music/jukebox': (
    <><rect x={6} y={6} width={44} height={28} rx={3} fill="currentColor" opacity={0.85} /><path d="M22 15 l9 5 -9 5 z" fill={G} /><Ln x1={12} y1={29} x2={44} y2={29} f={G} w={1} /></>
  ),

  /* itinerary */
  'itinerary/days': (
    <><Card x={5} y={6} w={14} h={28} /><B x={7} y={9} w={9} h={2} f={G} /><B x={7} y={15} w={9} h={1.5} o={0.5} /><B x={7} y={19} w={7} h={1.5} o={0.5} /><Card x={21} y={6} w={14} h={28} /><B x={23} y={9} w={9} h={2} f={G} /><B x={23} y={15} w={9} h={1.5} o={0.5} /><B x={23} y={19} w={8} h={1.5} o={0.5} /><Card x={37} y={6} w={14} h={28} /><B x={39} y={9} w={9} h={2} f={G} /><B x={39} y={15} w={8} h={1.5} o={0.5} /></>
  ),
  'itinerary/flow': (
    <><Ln x1={12} y1={4} x2={12} y2={36} /><B x={9} y={6} w={6} h={2.4} f={G} rx={1.2} /><D cx={12} cy={14} r={1.8} f={A} /><B x={18} y={13} w={24} /><D cx={12} cy={20} r={1.8} f={A} /><B x={18} y={19} w={18} o={0.6} /><B x={9} y={25} w={6} h={2.4} f={G} rx={1.2} /><D cx={12} cy={32} r={1.8} f={A} /><B x={18} y={31} w={22} /></>
  ),
  'itinerary/tickets': (
    <><Card x={6} y={7} w={44} h={12} /><Ln x1={36} y1={7} x2={36} y2={19} dash="2 2" /><B x={10} y={11.5} w={20} h={2.2} /><B x={40} y={11.5} w={6} h={2.6} f={G} /><Card x={6} y={22} w={44} h={12} /><Ln x1={36} y1={22} x2={36} y2={34} dash="2 2" /><B x={10} y={26.5} w={16} h={2.2} /><B x={40} y={26.5} w={6} h={2.6} f={G} /></>
  ),

  /* costSplitter */
  'costSplitter/ledger': (
    <><B x={7} y={7} w={18} h={2} o={0.7} /><B x={40} y={7} w={8} h={2} f={G} /><Ln x1={7} y1={13} x2={49} y2={13} /><B x={7} y={16} w={14} h={2} o={0.7} /><B x={40} y={16} w={8} h={2} f={G} /><Ln x1={7} y1={22} x2={49} y2={22} /><B x={7} y={25} w={16} h={2} o={0.7} /><B x={40} y={25} w={8} h={2} f={G} /><Ln x1={7} y1={30.5} x2={49} y2={30.5} w={1.3} f="currentColor" /><B x={36} y={33} w={12} h={2.4} /></>
  ),
  'costSplitter/cards': (
    <><Card x={6} y={9} w={21} h={22} /><B x={9} y={13} w={13} h={2} /><B x={9} y={19} w={9} h={2.6} f={G} /><Card x={29} y={9} w={21} h={22} /><B x={32} y={13} w={11} h={2} /><B x={32} y={19} w={9} h={2.6} f={G} /></>
  ),

  /* activityVote */
  'activityVote/pills': (
    <><B x={8} y={9} w={17} h={6} rx={3} f={AB} /><B x={28} y={9} w={14} h={6} rx={3} f={AB} /><B x={11} y={18} w={15} h={6} rx={3} f={A} o={0.85} /><B x={29} y={18} w={13} h={6} rx={3} f={AB} /><D cx={19} cy={30} r={1.6} /><B x={23} y={29} w={12} h={1.8} o={0.5} /></>
  ),
  'activityVote/bars': (
    <><B x={7} y={7} w={10} h={2} o={0.6} /><rect x={7} y={10.5} width={34} height={4.5} rx={2.2} fill={A} /><B x={7} y={18} w={10} h={2} o={0.6} /><rect x={7} y={21.5} width={22} height={4.5} rx={2.2} fill={A} opacity={0.55} /><B x={7} y={29} w={10} h={2} o={0.6} /><rect x={7} y={32.5} width={13} height={4.5} rx={2.2} fill={A} opacity={0.35} /></>
  ),

  /* toastSignup */
  'toastSignup/slots': (
    <><Card x={6} y={7} w={44} h={12} /><B x={10} y={10.5} w={3.2} h={4} f={G} /><B x={17} y={11.5} w={18} h={2.2} /><B x={40} y={10.5} w={6} h={4} f={A} rx={2} /><Card x={6} y={22} w={44} h={12} /><B x={10} y={25.5} w={3.2} h={4} f={G} /><B x={17} y={26.5} w={14} h={2.2} o={0.4} /><B x={40} y={25.5} w={6} h={4} rx={2} f={AB} /></>
  ),
  'toastSignup/list': (
    <><B x={8} y={8} w={3} h={3} f={G} /><B x={14} y={8.5} w={24} /><Ln x1={8} y1={14.5} x2={48} y2={14.5} /><B x={8} y={18} w={3} h={3} f={G} /><B x={14} y={18.5} w={20} /><Ln x1={8} y1={24.5} x2={48} y2={24.5} /><B x={8} y={28} w={3} h={3} f={G} /><B x={14} y={28.5} w={22} o={0.4} /></>
  ),

  /* adviceWall */
  'adviceWall/wall': (
    <><Card x={6} y={6} w={14} h={16} /><B x={8.5} y={9} w={9} h={1.5} o={0.6} /><B x={8.5} y={12} w={7} h={1.5} o={0.6} /><Card x={22} y={6} w={14} h={11} /><B x={24.5} y={9} w={9} h={1.5} o={0.6} /><Card x={38} y={6} w={12} h={20} /><B x={40.5} y={9} w={7} h={1.5} o={0.6} /><B x={40.5} y={12} w={6} h={1.5} o={0.6} /><Card x={6} y={24} w={14} h={10} /><Card x={22} y={19} w={14} h={15} /><B x={24.5} y={22} w={9} h={1.5} o={0.6} /><Card x={38} y={28} w={12} h={6} /></>
  ),
  'adviceWall/cards': CARD_GRID,
  'adviceWall/letters': (
    <><Card x={13} y={13} w={32} h={21} /><Card x={11} y={10} w={32} h={21} /><Card x={9} y={7} w={32} h={20} /><B x={13} y={11} w={18} h={1.6} o={0.6} /><B x={13} y={15} w={22} h={1.6} o={0.6} /><B x={13} y={19} w={16} h={1.6} o={0.6} /><path d="M28 23 q2.5 -3 5 0 t6 0" fill="none" stroke={G} strokeWidth="1" /></>
  ),

  /* program */
  'program/classic': (
    <><B x={20} y={6} w={16} h={2.4} /><Ln x1={24} y1={12} x2={32} y2={12} f={G} w={1.2} /><B x={17} y={16} w={22} o={0.6} /><B x={20} y={21} w={16} o={0.6} /><B x={15} y={26} w={26} o={0.6} /><B x={21} y={31} w={14} o={0.6} /></>
  ),
  'program/numbered': NUMBERED,
  'program/centerline': (
    <><Ln x1={28} y1={4} x2={28} y2={36} f={G} w={1.1} /><B x={8} y={8} w={16} /><D cx={28} cy={9} r={1.6} f={A} /><D cx={28} cy={19} r={1.6} f={A} /><B x={32} y={18} w={16} /><B x={11} y={28} w={13} /><D cx={28} cy={29} r={1.6} f={A} /></>
  ),

  /* livestream */
  'livestream/card': (
    <><Card x={8} y={5} w={40} h={24} /><path d="M25 12 l8 5 -8 5 z" fill={A} /><B x={21} y={31.5} w={14} h={3.6} f={G} rx={1.8} /></>
  ),
  'livestream/cinema': (
    <><rect x={4} y={6} width={48} height={5} fill="currentColor" opacity={0.85} /><P x={4} y={11} w={48} h={18} o={0.65} /><path d="M25 15 l8 5 -8 5 z" fill={CARD} /><rect x={4} y={29} width={48} height={5} fill="currentColor" opacity={0.85} /></>
  ),

  /* obituary */
  'obituary/letter': (
    <><B x={18} y={6} w={20} h={2.6} /><Ln x1={24} y1={12.5} x2={32} y2={12.5} f={G} w={1} /><B x={14} y={17} w={28} o={0.55} /><B x={14} y={21} w={26} o={0.55} /><B x={14} y={25} w={28} o={0.55} /><B x={14} y={29} w={20} o={0.55} /></>
  ),
  'obituary/columns': (
    <><B x={13} y={6} w={30} h={2.6} /><B x={7} y={14} w={19} o={0.55} /><B x={7} y={18} w={17} o={0.55} /><B x={7} y={22} w={19} o={0.55} /><B x={7} y={26} w={15} o={0.55} /><B x={30} y={14} w={19} o={0.55} /><B x={30} y={18} w={18} o={0.55} /><B x={30} y={22} w={19} o={0.55} /><B x={30} y={26} w={12} o={0.55} /></>
  ),

  /* packingList */
  'packingList/checklist': (
    <><rect x={8} y={7} width={4.5} height={4.5} rx={1} fill={A} /><path d="M9 9.2 l1.3 1.3 2-2.4" stroke={CARD} strokeWidth="1" fill="none" /><B x={17} y={8.2} w={24} /><rect x={8} y={17} width={4.5} height={4.5} rx={1} fill={A} /><path d="M9 19.2 l1.3 1.3 2-2.4" stroke={CARD} strokeWidth="1" fill="none" /><B x={17} y={18.2} w={18} /><rect x={8} y={27} width={4.5} height={4.5} rx={1} fill="none" stroke={L} strokeWidth="0.9" /><B x={17} y={28.2} w={21} o={0.45} /></>
  ),
  'packingList/grid': (
    <><rect x={7} y={8} width={4} height={4} rx={1} fill={A} /><B x={14} y={9} w={11} h={1.8} /><rect x={30} y={8} width={4} height={4} rx={1} fill={A} /><B x={37} y={9} w={11} h={1.8} /><rect x={7} y={18} width={4} height={4} rx={1} fill="none" stroke={L} strokeWidth="0.9" /><B x={14} y={19} w={9} h={1.8} o={0.5} /><rect x={30} y={18} width={4} height={4} rx={1} fill={A} /><B x={37} y={19} w={9} h={1.8} /><rect x={7} y={28} width={4} height={4} rx={1} fill="none" stroke={L} strokeWidth="0.9" /><B x={14} y={29} w={11} h={1.8} o={0.5} /></>
  ),

  /* honorList */
  'honorList/cards': (
    <><Card x={6} y={8} w={13} h={24} /><circle cx={12.5} cy={15} r={3.2} fill={A} opacity={0.6} /><B x={9} y={22} w={7} h={1.6} o={0.6} /><Card x={21.5} y={8} w={13} h={24} /><circle cx={28} cy={15} r={3.2} fill={A} opacity={0.6} /><B x={24.5} y={22} w={7} h={1.6} o={0.6} /><Card x={37} y={8} w={13} h={24} /><circle cx={43.5} cy={15} r={3.2} fill={A} opacity={0.6} /><B x={40} y={22} w={7} h={1.6} o={0.6} /></>
  ),
  'honorList/circle': (
    <><circle cx={14} cy={16} r={5.5} fill={A} opacity={0.65} /><circle cx={28} cy={16} r={5.5} fill={A} opacity={0.45} /><circle cx={42} cy={16} r={5.5} fill={A} opacity={0.8} /><B x={10} y={26} w={8} h={1.6} o={0.55} /><B x={24} y={26} w={8} h={1.6} o={0.55} /><B x={38} y={26} w={8} h={1.6} o={0.55} /></>
  ),
  'honorList/rows': (
    <><circle cx={11} cy={10} r={2.6} fill={A} opacity={0.6} /><B x={17} y={8} w={18} /><B x={17} y={11.5} w={10} h={1.5} o={0.45} /><circle cx={11} cy={21} r={2.6} fill={A} opacity={0.6} /><B x={17} y={19} w={15} /><B x={17} y={22.5} w={11} h={1.5} o={0.45} /><circle cx={11} cy={32} r={2.6} fill={A} opacity={0.6} /><B x={17} y={30} w={17} /></>
  ),
};

/* Generic fallback — three stacked bars. Any variant id that lands
   here should get a real sketch added above. */
const FALLBACK = (
  <><B x={8} y={9} w={36} h={3} /><B x={8} y={17} w={36} h={3} o={0.6} /><B x={8} y={25} w={25} h={3} o={0.6} /></>
);

/* ── VariantGlyph — the 56×40 tile PropertyRail mounts. ────────
   The tile ground is the live theme's paper + hairline so the
   sketch reads as a miniature of the actual site, not editor
   chrome. `color` carries the theme ink down to `currentColor`
   reads inside the sketch. */
export function VariantGlyph({ section, variant, style }: {
  section: Exclude<SectionId, null>;
  variant: string;
  style?: CSSProperties;
}) {
  const node = VARIANT_GLYPHS[`${section}/${variant}`] ?? FALLBACK;
  return (
    <div
      aria-hidden
      style={{
        width: 56,
        height: 40,
        borderRadius: 5,
        background: 'var(--t-paper, #FDFAF0)',
        border: '1px solid var(--t-line-soft, rgba(61,74,31,0.10))',
        color: 'var(--t-ink, #3D4A1F)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        ...style,
      }}
    >
      <svg width={56} height={40} viewBox="0 0 56 40">{node}</svg>
    </div>
  );
}
