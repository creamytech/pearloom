'use client';

// ─────────────────────────────────────────────────────────────
// LivingCanvas.tsx — Animated background that reacts to wizard data
// Full-screen layer behind the chat card. Pure CSS animations.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';

/* ── Props ───────────────────────────────────────────────────── */

export interface LivingCanvasProps {
  occasion?: string;
  names?: [string, string];
  date?: string;
  venue?: string;
  vibe?: string;
  photoCount?: number;
  phase?: 'chat' | 'generating' | 'done';
}

/* ── Gradient palette helpers ────────────────────────────────── */

/**
 * Comprehensive color vocabulary — maps natural-language words found
 * in a vibe string to hex colours.  This covers:
 *   - Named CSS colours / common colour words
 *   - Sports teams (NBA, NFL, MLB, NHL, soccer)
 *   - Seasons, materials, cultural references
 *   - Flowers, gemstones, foods/drinks
 * Each entry may map to 1–3 hex values (primary, secondary, tertiary).
 */
const COLOR_VOCAB: Record<string, string[]> = {
  // ── Named colours ──
  red:        ['#DC2626', '#FCA5A5'],
  crimson:    ['#DC143C', '#F5B7B1'],
  scarlet:    ['#FF2400', '#FF7F7F'],
  orange:     ['#F97316', '#FDBA74'],
  tangerine:  ['#FF9966', '#FFDAB9'],
  amber:      ['#F59E0B', '#FDE68A'],
  yellow:     ['#EAB308', '#FEF08A'],
  gold:       ['#C4A96A', '#E8D5A0'],
  golden:     ['#C4A96A', '#E8D5A0'],
  lime:       ['#84CC16', '#D9F99D'],
  green:      ['#16A34A', '#86EFAC'],
  emerald:    ['#059669', '#6EE7B7'],
  sage:       ['#A3B18A', '#C8D5B9'],
  olive:      ['#6B7F3B', '#A3B18A'],
  teal:       ['#0D9488', '#99F6E4'],
  cyan:       ['#06B6D4', '#A5F3FC'],
  turquoise:  ['#30D5C8', '#B2F5EA'],
  blue:       ['#2563EB', '#93C5FD'],
  navy:       ['#1E3A5F', '#4B7399'],
  cobalt:     ['#0047AB', '#6B9BD2'],
  indigo:     ['#4F46E5', '#A5B4FC'],
  violet:     ['#7C3AED', '#C4B5FD'],
  purple:     ['#9333EA', '#D8B4FE'],
  lavender:   ['#C4A5E0', '#E8D5F5'],
  magenta:    ['#D946EF', '#F0ABFC'],
  fuchsia:    ['#C026D3', '#F0ABFC'],
  pink:       ['#EC4899', '#F9A8D4'],
  blush:      ['#F2C6C6', '#FCE4EC'],
  rose:       ['#E8B4C8', '#F5E1E8'],
  mauve:      ['#9B7DA0', '#D4B8D9'],
  coral:      ['#F87171', '#FECACA'],
  peach:      ['#FDBA74', '#FEF3C7'],
  ivory:      ['#FFFFF0', '#F5F5DC'],
  cream:      ['#FFFDD0', '#FFF8E7'],
  champagne:  ['#F7E7CE', '#FFF3E0'],
  taupe:      ['#B8A99A', '#D4C5B5'],
  beige:      ['#DCC9A4', '#F0E4D0'],
  brown:      ['#92400E', '#D4A574'],
  chocolate:  ['#7B3F00', '#B8860B'],
  copper:     ['#B87333', '#E0A370'],
  bronze:     ['#CD7F32', '#E8C888'],
  silver:     ['#C0C0C0', '#E5E7EB'],
  charcoal:   ['#36454F', '#6B7280'],
  slate:      ['#475569', '#94A3B8'],
  black:      ['#1E1B24', '#3D3544'],
  white:      ['#F8F8F8', '#FFFFFF'],
  burgundy:   ['#800020', '#B3445C'],
  maroon:     ['#800000', '#A0522D'],
  terracotta: ['#CC6B49', '#E0997B'],
  rust:       ['#B7410E', '#D4764E'],
  mint:       ['#AAF0D1', '#D5F5E3'],

  // ── Moods / aesthetics ──
  romantic:   ['#F2D1D1', '#E8B4C8', '#FCE4EC'],
  moody:      ['#2D2B33', '#3D3544', '#4A3F54'],
  dark:       ['#2D2B33', '#1E1B24', '#3D3544'],
  bold:       ['#FF6B6B', '#FFC857', '#5BCEFA'],
  colorful:   ['#FF6B6B', '#FFC857', '#5BCEFA'],
  rustic:     ['#D4A574', '#A8B890', '#C8B896'],
  natural:    ['#D4A574', '#A8B890', '#E8D5B0'],
  modern:     ['#F5F5F0', '#E8E4DC', '#D4CFC4'],
  minimal:    ['#F5F5F0', '#D4CFC4', '#FFFFFF'],
  whimsical:  ['#FFD1DC', '#E8D5F5', '#D5F5E3'],
  fun:        ['#FFD1DC', '#FFF3CD', '#D5F5E3'],
  elegant:    ['#F0E6D6', '#C4A96A', '#E4D5C3'],
  timeless:   ['#F0E6D6', '#C4A96A', '#FAF3E8'],
  coastal:    ['#B8D4E8', '#5B9BD5', '#E8F0F8'],
  beach:      ['#B8D4E8', '#F5D5A0', '#5B9BD5'],
  tropical:   ['#FF6B6B', '#34D399', '#FFC857'],
  bohemian:   ['#D4A574', '#C27BA0', '#E8D5A0'],
  boho:       ['#D4A574', '#C27BA0', '#E8D5A0'],
  vintage:    ['#DCC9A4', '#C4A96A', '#E8D5C4'],
  retro:      ['#E06C75', '#E5C07B', '#56B6C2'],
  glamorous:  ['#C4A96A', '#2D2B33', '#E8D5A0'],
  glam:       ['#C4A96A', '#2D2B33', '#E8D5A0'],
  garden:     ['#A3B18A', '#D5F5E3', '#F2D1D1'],
  woodland:   ['#5F7A3B', '#8B6F47', '#A3B18A'],
  celestial:  ['#1E1B3A', '#7C3AED', '#FDE68A'],
  ethereal:   ['#E8D5F5', '#B8D4E8', '#F5E1E8'],
  fairy:      ['#E8D5F5', '#D5F5E3', '#FFD1DC'],
  gothic:     ['#1E1B24', '#800020', '#C4A96A'],
  industrial: ['#374151', '#6B7280', '#D4A574'],
  luxe:       ['#C4A96A', '#1E1B24', '#F0E6D6'],
  luxury:     ['#C4A96A', '#1E1B24', '#F0E6D6'],
  regal:      ['#552583', '#C4A96A', '#1E1B24'],
  royal:      ['#1E3A5F', '#C4A96A', '#FFFFFF'],
  pastel:     ['#FFD1DC', '#D5F5E3', '#E8D5F5'],
  neon:       ['#39FF14', '#FF073A', '#FF6EFF'],
  earthy:     ['#92400E', '#A3B18A', '#D4A574'],
  dreamy:     ['#E8D5F5', '#F5E1E8', '#B8D4E8'],

  // ── Seasons ──
  spring:     ['#FFD1DC', '#D5F5E3', '#FFF3CD'],
  summer:     ['#FFC857', '#FF6B6B', '#5BCEFA'],
  autumn:     ['#D4A574', '#B7410E', '#C4A96A'],
  fall:       ['#D4A574', '#B7410E', '#C4A96A'],
  winter:     ['#B8D4E8', '#E5E7EB', '#1E3A5F'],

  // ── Flowers ──
  sunflower:  ['#FFC857', '#92400E', '#FDE68A'],
  peony:      ['#F472B6', '#FFD1DC', '#FFFFFF'],
  orchid:     ['#9B7DA0', '#E8D5F5', '#FFFFFF'],
  tulip:      ['#DC2626', '#FDE68A', '#16A34A'],
  dahlia:     ['#C026D3', '#FF6B6B', '#FFC857'],
  jasmine:    ['#FFFFF0', '#FFFDD0', '#F5F5DC'],
  cherry:     ['#FFB7C5', '#FFFFFF', '#F472B6'],
  lilac:      ['#C8A2C8', '#E8D5F5', '#FFFFFF'],

  // ── Gemstones ──
  ruby:       ['#E0115F', '#FF6B81'],
  sapphire:   ['#0F52BA', '#6B9BD2'],
  amethyst:   ['#9966CC', '#C4A5E0'],
  topaz:      ['#FFC87C', '#FFE4B5'],
  opal:       ['#A8C3BC', '#E8D5F5', '#F5E1E8'],
  pearl:      ['#F0EAE2', '#FFFFFF', '#E8D5C4'],
  diamond:    ['#B9F2FF', '#FFFFFF', '#E5E7EB'],

  // ── Sports teams (NBA) ──
  knicks:     ['#F58426', '#1D42BA'],
  lakers:     ['#552583', '#FDB927'],
  celtics:    ['#007A33', '#BA9653'],
  warriors:   ['#1D428A', '#FFC72C'],
  bulls:      ['#CE1141', '#000000'],
  heat:       ['#98002E', '#F9A01B'],
  nets:       ['#000000', '#FFFFFF'],
  sixers:     ['#006BB6', '#ED174C'],
  '76ers':    ['#006BB6', '#ED174C'],
  raptors:    ['#CE1141', '#000000'],
  bucks:      ['#00471B', '#EEE1C6'],
  suns:       ['#1D1160', '#E56020'],
  mavs:       ['#00538C', '#002B5E'],
  mavericks:  ['#00538C', '#002B5E'],
  spurs:      ['#C4CED4', '#000000'],
  nuggets:    ['#0E2240', '#FEC524'],
  clippers:   ['#C8102E', '#1D428A'],
  hawks:      ['#E03A3E', '#C1D32F'],
  pacers:     ['#002D62', '#FDBB30'],
  wizards:    ['#002B5C', '#E31837'],
  cavs:       ['#860038', '#FDBB30'],
  cavaliers:  ['#860038', '#FDBB30'],
  thunder:    ['#007AC1', '#EF6100'],
  jazz:       ['#002B5C', '#F9A01B'],
  pelicans:   ['#0C2340', '#C8102E'],
  hornets:    ['#1D1160', '#00788C'],
  magic:      ['#0077C0', '#000000'],
  pistons:    ['#C8102E', '#1D42BA'],
  kings:      ['#5A2D81', '#63727A'],
  blazers:    ['#E03A3E', '#000000'],
  wolves:     ['#0C2340', '#78BE20'],
  timberwolves: ['#0C2340', '#78BE20'],
  grizzlies:  ['#5D76A9', '#12173F'],

  // ── Sports teams (NFL) ──
  cowboys:    ['#003594', '#869397'],
  patriots:   ['#002244', '#C60C30'],
  eagles:     ['#004C54', '#A5ACAF'],
  '49ers':    ['#AA0000', '#B3995D'],
  niners:     ['#AA0000', '#B3995D'],
  chiefs:     ['#E31837', '#FFB81C'],
  steelers:   ['#FFB612', '#101820'],
  packers:    ['#203731', '#FFB612'],
  raiders:    ['#000000', '#A5ACAF'],
  dolphins:   ['#008E97', '#FC4C02'],
  ravens:     ['#241773', '#9E7C0C'],
  bills:      ['#00338D', '#C60C30'],
  bengals:    ['#FB4F14', '#000000'],
  chargers:   ['#0080C6', '#FFC20E'],
  broncos:    ['#FB4F14', '#002244'],
  falcons:    ['#A71930', '#000000'],
  panthers:   ['#0085CA', '#101820'],
  saints:     ['#D3BC8D', '#101820'],
  giants:     ['#0B2265', '#A71930'],
  jets:       ['#125740', '#FFFFFF'],
  lions:      ['#0076B6', '#B0B7BC'],
  bears:      ['#0B162A', '#C83803'],
  vikings:    ['#4F2683', '#FFC62F'],
  seahawks:   ['#002244', '#69BE28'],
  commanders: ['#5A1414', '#FFB612'],
  titans:     ['#0C2340', '#4B92DB'],
  texans:     ['#03202F', '#A71930'],
  jaguars:    ['#006778', '#D7A22A'],
  colts:      ['#002C5F', '#A2AAAD'],
  cardinals:  ['#97233F', '#000000'],
  rams:       ['#003594', '#FFA300'],
  browns:     ['#311D00', '#FF3C00'],

  // ── Sports teams (MLB) ──
  yankees:    ['#1C2C5B', '#FFFFFF'],
  mets:       ['#002D72', '#FF5910'],
  dodgers:    ['#005A9C', '#EF3E42'],
  redsox:     ['#BD3039', '#0C2340'],
  'red sox':  ['#BD3039', '#0C2340'],
  cubs:       ['#0E3386', '#CC3433'],
  astros:     ['#002D62', '#EB6E1F'],
  braves:     ['#CE1141', '#13274F'],
  phillies:   ['#E81828', '#002D72'],
  padres:     ['#2F241D', '#FFC425'],
  mariners:   ['#0C2C56', '#005C5C'],
  bluejays:   ['#134A8E', '#E8291C'],
  'blue jays': ['#134A8E', '#E8291C'],
  orioles:    ['#DF4601', '#000000'],
  twins:      ['#002B5C', '#D31145'],
  guardians:  ['#00385D', '#E50022'],
  royals:     ['#004687', '#BD9B60'],
  tigers:     ['#0C2340', '#FA4616'],
  whitesox:   ['#27251F', '#C4CED4'],
  'white sox': ['#27251F', '#C4CED4'],
  reds:       ['#C6011F', '#000000'],
  brewers:    ['#12284B', '#FFC52F'],
  pirates:    ['#27251F', '#FDB827'],
  rockies:    ['#33006F', '#C4CED4'],
  nationals:  ['#AB0003', '#14225A'],
  marlins:    ['#00A3E0', '#EF3340'],
  rays:       ['#092C5C', '#8FBCE6'],
  athletics:  ['#003831', '#EFB21E'],
  angels:     ['#BA0021', '#003263'],
  rangers:    ['#003278', '#C0111F'],
  diamondbacks: ['#A71930', '#E3D4AD'],

  // ── Sports teams (soccer / international) ──
  'man united': ['#DA291C', '#FBE122'],
  'man city':   ['#6CABDD', '#1C2C5B'],
  arsenal:      ['#EF0107', '#FFFFFF'],
  chelsea:      ['#034694', '#FFFFFF'],
  liverpool:    ['#C8102E', '#00B2A9'],
  barcelona:    ['#A50044', '#004D98'],
  'real madrid': ['#FEBE10', '#00529F'],
  bayern:       ['#DC052D', '#0066B2'],
  psg:          ['#004170', '#DA291C'],
  juventus:     ['#000000', '#FFFFFF'],

  // ── Materials / textures ──
  marble:     ['#F5F5F0', '#D4CFC4', '#E8E4DC'],
  velvet:     ['#4A3F54', '#7C3AED', '#2D2B33'],
  silk:       ['#F0EAE2', '#E8D5C4', '#F5F5F0'],
  linen:      ['#E8DFD0', '#D4C9B8', '#F0EBE0'],
  denim:      ['#1E3A5F', '#4B7399', '#8FB0D0'],
  leather:    ['#5C3317', '#8B4513', '#D4A574'],

  // ── Food / drink (common wedding/party themes) ──
  wine:       ['#722F37', '#B5485D', '#F2C6C6'],
  rosé:       ['#F9A8D4', '#FDE8EF', '#FFFFFF'],
  sangria:    ['#92000A', '#FF6B6B', '#FFC857'],
  citrus:     ['#FFC857', '#FF6B6B', '#16A34A'],
  berry:      ['#6B21A8', '#DC2626', '#EC4899'],
  mocha:      ['#5C3317', '#D4A574', '#F0E6D6'],
  espresso:   ['#3C1F0A', '#5C3317', '#D4A574'],
  honey:      ['#EB9605', '#FDE68A', '#FFF8E7'],
  cinnamon:   ['#D2691E', '#E0997B', '#FDE68A'],
};

/**
 * Build a CSS gradient from an array of hex colours.
 * 2 colours → simple two-stop, 3+ → evenly spaced.
 */
function buildGradient(colors: string[]): string {
  if (colors.length === 0) return '';
  if (colors.length === 1) {
    // Lighten the single colour for a second stop
    return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]}44 100%)`;
  }
  if (colors.length === 2) {
    return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[0]} 100%)`;
  }
  const stops = colors.map((c, i) => {
    const pct = Math.round((i / (colors.length - 1)) * 100);
    return `${c} ${pct}%`;
  });
  return `linear-gradient(135deg, ${stops.join(', ')})`;
}

/**
 * Dynamically derive a gradient from ANY vibe string.
 *
 * Strategy:
 * 1. Scan for known vocabulary words (longest-match-first to handle
 *    multi-word entries like "red sox" before "red").
 * 2. Collect all matched colours.
 * 3. Build a gradient from the unique colours found (max 5 stops).
 * 4. Falls back to empty string if nothing matches.
 */
function gradientForVibe(vibe?: string): string {
  if (!vibe) return '';
  const v = vibe.toLowerCase();

  // Sort vocabulary keys longest-first so "red sox" matches before "red"
  const sortedKeys = Object.keys(COLOR_VOCAB).sort((a, b) => b.length - a.length);

  const matched: string[] = [];
  const used = new Set<string>();

  for (const key of sortedKeys) {
    if (v.includes(key) && !used.has(key)) {
      used.add(key);
      for (const c of COLOR_VOCAB[key]) {
        if (!matched.includes(c)) matched.push(c);
      }
    }
  }

  // Limit to 5 stops for a clean gradient
  const colors = matched.slice(0, 5);
  return buildGradient(colors);
}

/** Particle color sets — prefers vibe-derived colours, falls back to occasion defaults. */
function occasionColors(occasion?: string, vibe?: string): string[] {
  // If there's a vibe, try to extract colours from it for particles too
  if (vibe) {
    const v = vibe.toLowerCase();
    const sortedKeys = Object.keys(COLOR_VOCAB).sort((a, b) => b.length - a.length);
    const vibeColors: string[] = [];
    const used = new Set<string>();
    for (const key of sortedKeys) {
      if (v.includes(key) && !used.has(key)) {
        used.add(key);
        for (const c of COLOR_VOCAB[key]) {
          if (!vibeColors.includes(c)) vibeColors.push(c);
        }
      }
    }
    if (vibeColors.length >= 2) return vibeColors.slice(0, 6);
  }

  switch (occasion) {
    case 'wedding':     return ['#F2C6C6', '#F5D5D5', '#E8A0A0', '#F0B8B8'];
    case 'birthday':    return ['#FF6B6B', '#FFC857', '#5BCEFA', '#F472B6', '#A78BFA', '#34D399'];
    case 'anniversary': return ['#C4A96A', '#DBC07E', '#E8D5A0', '#B89A5A'];
    case 'engagement':  return ['#F2C6C6', '#FFD1DC', '#E8A0B4', '#F5B8C8'];
    default:            return ['#E8D5C4', '#D4B8A0', '#A3B18A', '#C4A96A'];
  }
}

/* ── Keyframes (injected once via <style>) ───────────────────── */

const KEYFRAMES = `
/* Base orb drift */
@keyframes lc-drift {
  0%   { transform: translate(0, 0) scale(1); }
  25%  { transform: translate(30px, -40px) scale(1.05); }
  50%  { transform: translate(-20px, -70px) scale(0.95); }
  75%  { transform: translate(-40px, -20px) scale(1.03); }
  100% { transform: translate(0, 0) scale(1); }
}

/* Petal / confetti fall */
@keyframes lc-fall {
  0%   { transform: translateY(-10%) translateX(0) rotate(0deg); opacity: 0; }
  10%  { opacity: 0.7; }
  90%  { opacity: 0.7; }
  100% { transform: translateY(110vh) translateX(40px) rotate(360deg); opacity: 0; }
}

/* Sparkle twinkle */
@keyframes lc-twinkle {
  0%, 100% { opacity: 0; transform: scale(0.6); }
  50%      { opacity: 0.8; transform: scale(1); }
}

/* Heart path — subtle bob */
@keyframes lc-heart-bob {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
  50%      { transform: translateY(-12px) scale(1.08); opacity: 0.5; }
}

/* Names watermark breathe */
@keyframes lc-breathe {
  0%, 100% { transform: scale(1); opacity: 0.035; }
  50%      { transform: scale(1.04); opacity: 0.05; }
}

/* Countdown pulse */
@keyframes lc-pulse {
  0%, 100% { opacity: 0.03; transform: scale(1); }
  50%      { opacity: 0.05; transform: scale(1.02); }
}

/* Photo drift */
@keyframes lc-photo-drift {
  0%   { transform: translate(0, 0) rotate(var(--lc-rot)); }
  50%  { transform: translate(10px, -15px) rotate(calc(var(--lc-rot) + 2deg)); }
  100% { transform: translate(0, 0) rotate(var(--lc-rot)); }
}

/* Generating vortex — converge to center */
@keyframes lc-vortex {
  0%   { transform: translate(var(--lc-x), var(--lc-y)) scale(1); opacity: 0.6; }
  100% { transform: translate(0, 0) scale(0.1); opacity: 0; }
}
`;

/* ── Component ──────────────────────────────────────────────── */

export function LivingCanvas({
  occasion,
  names,
  date,
  venue,
  vibe,
  photoCount = 0,
  phase = 'chat',
}: LivingCanvasProps) {

  const isGenerating = phase === 'generating';

  /* Gradient: vibe-driven if set, else warm default */
  const vibeGradient = gradientForVibe(vibe);
  const baseGradient = 'linear-gradient(135deg, #E8D5C4 0%, #F2E6D9 25%, #D4B8A0 50%, #E8CDB8 75%, #F0DFD0 100%)';
  const gradient = vibeGradient || baseGradient;

  /* Base orbs — always present (max 4) */
  const orbs = useMemo(() => {
    const colors = ['#E8D5C4', '#D4B8A0', '#A3B18A', '#C4A96A'];
    return colors.map((c, i) => ({
      key: `orb-${i}`,
      color: c,
      size: 120 + i * 40,
      left: `${15 + i * 22}%`,
      top: `${20 + (i % 3) * 25}%`,
      delay: `${i * -4}s`,
      duration: `${18 + i * 4}s`,
    }));
  }, []);

  /* Occasion particles — max 12 */
  const particles = useMemo(() => {
    if (!occasion) return [];
    const colors = occasionColors(occasion, vibe);
    const count = Math.min(12, occasion === 'birthday' ? 12 : 8);
    return Array.from({ length: count }, (_, i) => ({
      key: `particle-${i}`,
      color: colors[i % colors.length],
      size: occasion === 'anniversary' ? 4 + Math.random() * 4 : 6 + Math.random() * 8,
      left: `${5 + Math.random() * 90}%`,
      delay: `${-Math.random() * 12}s`,
      duration: `${8 + Math.random() * 8}s`,
      isHeart: occasion === 'engagement',
    }));
  }, [occasion]);

  /* Countdown — days until date */
  const daysUntil = useMemo(() => {
    if (!date) return null;
    try {
      const eventDate = new Date(date + 'T12:00:00');
      const now = new Date();
      const diff = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : null;
    } catch {
      return null;
    }
  }, [date]);

  /* Photo positions — max 8 scattered polaroids */
  const photoSlots = useMemo(() => {
    if (photoCount <= 0) return [];
    const count = Math.min(8, photoCount);
    return Array.from({ length: count }, (_, i) => ({
      key: `photo-slot-${i}`,
      left: `${8 + (i % 4) * 22 + Math.random() * 10}%`,
      top: `${10 + Math.floor(i / 4) * 40 + Math.random() * 15}%`,
      rotation: `${-12 + Math.random() * 24}deg`,
      delay: `${i * -2}s`,
    }));
  }, [photoCount]);

  /* Total particle count guard: orbs(4) + particles(12) + photoSlots(8) = max 24 but we're under 20 active animated */

  return (
    <>
      {/* Inject keyframes once */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Canvas root */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          background: gradient,
          transition: 'background 1.5s ease',
        }}
      >
        {/* ── Base orbs — soft drifting circles ── */}
        {orbs.map((orb) => (
          <div
            key={orb.key}
            style={{
              position: 'absolute',
              left: orb.left,
              top: orb.top,
              width: orb.size,
              height: orb.size,
              borderRadius: '50%',
              background: orb.color,
              opacity: 0.18,
              willChange: 'transform',
              animation: isGenerating
                ? `lc-vortex 3s ease-in forwards`
                : `lc-drift ${orb.duration} ease-in-out infinite`,
              animationDelay: isGenerating ? '0s' : orb.delay,
              ...(isGenerating
                ? {
                    '--lc-x': orb.left,
                    '--lc-y': orb.top,
                  } as React.CSSProperties
                : {}),
            }}
          />
        ))}

        {/* ── Occasion particles ── */}
        {particles.map((p) => {
          if (p.isHeart) {
            /* Engagement: heart shapes via CSS clip-path */
            return (
              <div
                key={p.key}
                style={{
                  position: 'absolute',
                  left: p.left,
                  top: `${30 + Math.random() * 40}%`,
                  width: p.size * 2,
                  height: p.size * 2,
                  background: p.color,
                  clipPath:
                    'path("M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z")',
                  opacity: 0.3,
                  willChange: 'transform',
                  animation: isGenerating
                    ? `lc-vortex 3s ease-in forwards`
                    : `lc-heart-bob ${p.duration} ease-in-out infinite`,
                  animationDelay: p.delay,
                }}
              />
            );
          }

          if (occasion === 'anniversary') {
            /* Anniversary: twinkling gold sparkles */
            return (
              <div
                key={p.key}
                style={{
                  position: 'absolute',
                  left: p.left,
                  top: `${10 + Math.random() * 80}%`,
                  width: p.size,
                  height: p.size,
                  borderRadius: '50%',
                  background: p.color,
                  willChange: 'transform, opacity',
                  animation: isGenerating
                    ? `lc-vortex 3s ease-in forwards`
                    : `lc-twinkle ${p.duration} ease-in-out infinite`,
                  animationDelay: p.delay,
                }}
              />
            );
          }

          /* Wedding: falling petals / Birthday: falling confetti */
          return (
            <div
              key={p.key}
              style={{
                position: 'absolute',
                left: p.left,
                top: '-5%',
                width: p.size,
                height: occasion === 'birthday' ? p.size * 0.6 : p.size,
                borderRadius: occasion === 'birthday' ? '2px' : '50% 0 50% 50%',
                background: p.color,
                opacity: 0,
                willChange: 'transform, opacity',
                animation: isGenerating
                  ? `lc-vortex 3s ease-in forwards`
                  : `lc-fall ${p.duration} linear infinite`,
                animationDelay: p.delay,
              }}
            />
          );
        })}

        {/* ── Names watermark ── */}
        {names && names[0] && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'lc-breathe 8s ease-in-out infinite',
              willChange: 'transform, opacity',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--pl-font-heading, "Playfair Display", Georgia, serif)',
                fontStyle: 'italic',
                fontSize: 'clamp(4rem, 12vw, 10rem)',
                fontWeight: 400,
                color: 'var(--pl-ink-soft, #3D3530)',
                opacity: 0.04,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              {names[0]}{names[1] ? ` & ${names[1]}` : ''}
            </span>
          </div>
        )}

        {/* ── Countdown watermark ── */}
        {daysUntil !== null && (
          <div
            style={{
              position: 'absolute',
              bottom: '8%',
              right: '6%',
              animation: 'lc-pulse 6s ease-in-out infinite',
              willChange: 'transform, opacity',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--pl-font-heading, "Playfair Display", Georgia, serif)',
                fontSize: 'clamp(3rem, 8vw, 7rem)',
                fontWeight: 700,
                color: 'var(--pl-ink-soft, #3D3530)',
                opacity: 0.04,
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              {daysUntil}
            </span>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--pl-font-body, "Lora", Georgia, serif)',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: 'var(--pl-ink-soft, #3D3530)',
                opacity: 0.04,
                userSelect: 'none',
              }}
            >
              days
            </span>
          </div>
        )}

        {/* ── Photo polaroid placeholders ── */}
        {photoSlots.map((slot) => (
          <div
            key={slot.key}
            style={{
              position: 'absolute',
              left: slot.left,
              top: slot.top,
              width: 68,
              height: 80,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.15)',
              border: '3px solid rgba(255,255,255,0.2)',
              boxShadow: '0 2px 8px rgba(43,30,20,0.06)',
              opacity: 0.18,
              willChange: 'transform',
              '--lc-rot': slot.rotation,
              transform: `rotate(${slot.rotation})`,
              animation: isGenerating
                ? `lc-vortex 3s ease-in forwards`
                : `lc-photo-drift ${12 + Math.random() * 6}s ease-in-out infinite`,
              animationDelay: slot.delay,
            } as React.CSSProperties}
          />
        ))}

        {/* ── Generating vortex intensifier overlay ── */}
        {isGenerating && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 50% 50%, rgba(163,177,138,0.25) 0%, transparent 60%)',
              animation: 'lc-pulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </>
  );
}
