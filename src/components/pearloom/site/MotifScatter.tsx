// ─────────────────────────────────────────────────────────────
// MotifScatter — direct port of the prototype's MotifScatter
// (themed-site.jsx / themes.jsx). Renders decorative SVG motifs
// scattered in a section's corners.
//
// All 12 prototype motifs are now resolvable here (full parity
// with ClaudeDesign/shared/themes.jsx Motif() switch):
//   olive    — OliveSprig (curving stem with leaves + berries)
//   bloom    — WatercolorBloom (3-stop radial blobs, watercolor
//              SVG filter displacement, requires #t-watercolor)
//   pressed  — PressedFlower (6-petal flower, centered)
//   lemon    — Lemon (citrus body + leaf accent)
//   sun      — SunMotif (circle with 12 radiating spokes)
//   wheat    — WheatMotif (vertical stalk with paired grains)
//   fern     — FernMotif (curving stem with paired fronds)
//   shell    — ShellMotif (scallop outline with ribs)
//   citrus   — CitrusMotif (cross-section: rind, flesh, segments)
//   laurel   — LaurelMotif (twin laurel curves with leaves)
//   deco-fan — DecoFan (Art-Deco quarter-fan with rays)
//   palm     — PalmMotif (palm trunk with fronds)
//
// Each new motif accepts the brief's signature:
//   { size = 22, color = 'currentColor' }
// and binds via fallback chain
//   var(--t-motif, var(--t-accent, var(--pl-olive)))
// so the theme palette flows through automatically.
//
// Each Edition maps to a recommended motif:
//   Almanac      → pressed (warm garden / wedding default)
//   Cinema       → none (clean, dark theatre stays uncluttered)
//   Postcard Box → olive (mediterranean / casual events)
//   Linen Folder → olive (formal mediterranean)
//   Quiet        → none (restraint)
//
// Density:
//   sparse   — 1 motif (default)
//   generous — 2-3 motifs (with bloom mode adding a Lemon)
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

export type MotifKind =
  | 'olive'
  | 'bloom'
  | 'pressed'
  | 'lemon'
  | 'sun'
  | 'wheat'
  | 'fern'
  | 'shell'
  | 'citrus'
  | 'laurel'
  | 'deco-fan'
  | 'palm'
  /* Custom additions — designed for occasions the original 12
     didn't have a strong fit for. */
  | 'mountain'   // triple-peak silhouette — destination, retreat
  | 'wave-curl'  // single sinuous brush wave — coastal, summer
  | 'rose'       // rose head + stem — anniversary, vow renewal
  | 'crescent'   // crescent moon + star — memorial, intimate
  | 'dove'       // abstract dove — wedding, baptism, memorial
  | 'arrows'     // crossed arrows — bachelor/ette, reunion
  | 'pinecone'   // pinecone — fall / winter / forest events
  | 'butterfly'  // butterfly — sweet sixteen, bridal shower
  /* 2026-06-09 collection — drawn for the occasions and palettes the
     first 20 still left uncovered. Same language: hairline strokes,
     round caps, accent body + a single gold grace note. */
  | 'magnolia'    // open magnolia bloom — southern garden, bridal
  | 'gingko'      // gingko fan leaf — modern botanical, autumn
  | 'champagne'   // coupe + rising bubbles — toasts, NYE, engagement
  | 'lantern'     // paper lantern — festival, tea ceremony, evening
  | 'compass'     // compass rose — destination, travel, reunion
  | 'peony'       // layered ruffle bloom — romantic, quinceañera
  | 'vine'        // trailing ivy curl — garden, heritage
  | 'starburst'   // retro atomic spray — whimsy, milestone birthdays
  | 'ribbon'      // tied bow — showers, gifts, sweet sixteen
  | 'hummingbird' // sipping hummingbird — intimate, garden morning
  /* 2026-06-09 collection II — hand-drawn for the gaps the gallery
     still showed: luxe florals, modern tropical, winter, spring,
     nautical, and the party wall. Same contract throughout. */
  | 'orchid'         // phalaenopsis in profile — luxe, formal
  | 'monstera'       // split monstera leaf — modern tropical
  | 'holly'          // crossed holly leaves + gold berries — winter, Noël
  | 'cherry-blossom' // sakura branch fragment — spring
  | 'anchor'         // classic anchor + rope — nautical, coastal
  | 'disco'          // faceted disco ball — party, NYE, bachelorette
  | 'none';
export type MotifDensity = 'none' | 'sparse' | 'generous';

/** Theme-aware default stroke/fill for the new prototype motifs.
 *  Falls back from per-theme motif var → per-theme accent → the
 *  brand olive token if neither is set (e.g. SSR / isolated preview). */
const MOTIF_COLOR = 'var(--t-motif, var(--t-accent, var(--pl-olive)))';

interface OliveSprigProps {
  size?: number;
  color?: string;
  berry?: string;
  flip?: boolean;
  style?: CSSProperties;
}

export function OliveSprig({ size = 90, color = 'var(--t-motif, var(--t-accent, var(--pl-olive, #5C6B3F)))', berry = 'var(--t-gold, var(--gold, #B8935A))', flip = false, style }: OliveSprigProps) {
  return (
    <svg
      viewBox="0 0 120 60"
      width={size}
      height={size * 0.5}
      style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }}
      aria-hidden="true"
    >
      <path
        d="M6 52 C 40 46, 78 36, 114 8"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {[
        [28, 44, -28],
        [44, 38, -30],
        [60, 31, -32],
        [76, 24, -34],
        [92, 17, -36],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <ellipse cx={0} cy={-7} rx={4.2} ry={9} fill={color} opacity={0.92} />
        </g>
      ))}
      {[
        [36, 47],
        [68, 30],
        [100, 14],
      ].map(([x, y], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y + 5}
          rx={3.4}
          ry={4.4}
          fill={berry}
          transform={`rotate(-18 ${x} ${y + 5})`}
        />
      ))}
    </svg>
  );
}

interface LemonProps {
  size?: number;
  color?: string;
  leaf?: string;
  style?: CSSProperties;
}

export function Lemon({ size = 44, color = 'var(--t-gold, var(--gold, #B8935A))', leaf = 'var(--t-accent, var(--pl-olive, #5C6B3F))', style }: LemonProps) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      <ellipse cx={30} cy={36} rx={17} ry={13} fill={color} transform="rotate(-24 30 36)" />
      <ellipse cx={22} cy={30} rx={4} ry={6} fill="rgba(255,255,255,0.35)" transform="rotate(-24 22 30)" />
      <path d="M40 22 C 48 14, 56 16, 56 16 C 54 24, 48 26, 40 22 Z" fill={leaf} />
      <path d="M40 22 C 46 18, 52 17, 56 16" stroke="rgba(255,255,255,0.4)" strokeWidth={1} fill="none" />
    </svg>
  );
}

interface PressedFlowerProps {
  size?: number;
  petal?: string;
  center?: string;
  style?: CSSProperties;
}

export function PressedFlower({ size = 56, petal = 'var(--t-motif, var(--t-accent, var(--peach-ink, #C6703D)))', center = 'var(--t-gold, var(--gold, #B8935A))', style }: PressedFlowerProps) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      <g transform="translate(30 30)">
        {petals.map((a, i) => (
          <ellipse
            key={i}
            cx={0}
            cy={-13}
            rx={6.5}
            ry={12}
            fill={petal}
            opacity={0.9}
            transform={`rotate(${a})`}
          />
        ))}
        <circle r={7} fill={center} />
        <circle r={7} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      </g>
    </svg>
  );
}

interface WatercolorBloomProps {
  size?: number;
  tone?: string;
  tone2?: string;
  style?: CSSProperties;
}

export function WatercolorBloom({ size = 120, tone = 'var(--t-accent, var(--pl-olive, #5C6B3F))', tone2 = 'var(--t-accent-ink, var(--peach-ink, #C6703D))', style }: WatercolorBloomProps) {
  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size, position: 'relative', ...style }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          /* Uses the t-watercolor filter from TextureFilters.tsx
             when available. Falls back to a plain blob if the
             filter isn't registered. */
          filter: 'url(#t-watercolor)',
          background: `radial-gradient(40% 40% at 38% 42%, ${tone} 0%, transparent 64%),
                       radial-gradient(38% 38% at 62% 56%, ${tone2} 0%, transparent 66%),
                       radial-gradient(30% 30% at 54% 36%, ${tone} 0%, transparent 60%)`,
          opacity: 0.85,
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Prototype-parity motifs ported from ClaudeDesign/shared/themes.jsx.
 * Each follows the brief's contract: `size` (default 22) + `color`
 * (default currentColor) with the theme-aware MOTIF_COLOR fallback.
 * They are intentionally simple geometric SVGs that read crisp at
 * 22px and scale up gracefully.
 * ───────────────────────────────────────────────────────────── */

interface BaseMotifProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export function SunMotif({ size = 22, color = MOTIF_COLOR, style }: BaseMotifProps) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      <circle cx={30} cy={30} r={11} fill="none" stroke={color} strokeWidth={2} />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const r1 = 16;
        const r2 = i % 2 ? 24 : 27;
        return (
          <line
            key={i}
            x1={30 + Math.cos(a) * r1}
            y1={30 + Math.sin(a) * r1}
            x2={30 + Math.cos(a) * r2}
            y2={30 + Math.sin(a) * r2}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

interface DirectionalMotifProps extends BaseMotifProps {
  flip?: boolean;
}

export function WheatMotif({ size = 22, color = MOTIF_COLOR, flip = false, style }: DirectionalMotifProps) {
  return (
    <svg
      viewBox="0 0 60 80"
      width={size * 0.75}
      height={size}
      style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }}
      aria-hidden="true"
    >
      <path d="M30 78 L30 22" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      {[20, 32, 44, 56].map((y, i) => (
        <g key={i}>
          <path d={`M30 ${y} Q18 ${y - 2} 14 ${y + 8}`} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
          <path d={`M30 ${y} Q42 ${y - 2} 46 ${y + 8}`} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
        </g>
      ))}
      <path d="M30 22 Q24 10 30 4 Q36 10 30 22" fill={color} />
    </svg>
  );
}

export function FernMotif({ size = 22, color = MOTIF_COLOR, flip = false, style }: DirectionalMotifProps) {
  return (
    <svg
      viewBox="0 0 60 90"
      width={size * 0.67}
      height={size}
      style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }}
      aria-hidden="true"
    >
      <path d="M30 88 C 30 60, 30 30, 30 6" fill="none" stroke={color} strokeWidth={1.6} />
      {Array.from({ length: 9 }).map((_, i) => {
        const y = 80 - i * 9;
        const len = 22 - i * 2;
        return (
          <g key={i}>
            <path
              d={`M30 ${y} Q${30 - len * 0.6} ${y - 3} ${30 - len} ${y - 9}`}
              fill="none"
              stroke={color}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <path
              d={`M30 ${y} Q${30 + len * 0.6} ${y - 3} ${30 + len} ${y - 9}`}
              fill="none"
              stroke={color}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

export function ShellMotif({ size = 22, color = MOTIF_COLOR, style }: BaseMotifProps) {
  return (
    <svg viewBox="0 0 60 56" width={size} height={size * 0.93} style={style} aria-hidden="true">
      <path d="M30 52 C 8 52, 4 22, 30 6 C 56 22, 52 52, 30 52 Z" fill="none" stroke={color} strokeWidth={1.6} />
      {[-20, -10, 0, 10, 20].map((d, i) => (
        <path key={i} d={`M30 50 Q${30 + d} 24 ${30 + d * 1.5} 9`} fill="none" stroke={color} strokeWidth={1.2} opacity={0.8} />
      ))}
    </svg>
  );
}

export function CitrusMotif({ size = 22, color = MOTIF_COLOR, style }: BaseMotifProps) {
  const flesh = 'var(--t-gold, var(--gold, #B8935A))';
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      <circle cx={30} cy={30} r={22} fill="none" stroke={color} strokeWidth={2} />
      <circle cx={30} cy={30} r={16} fill={`color-mix(in oklab, ${flesh} 30%, transparent)`} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={30}
            y1={30}
            x2={30 + Math.cos(a) * 15}
            y2={30 + Math.sin(a) * 15}
            stroke={color}
            strokeWidth={1.3}
          />
        );
      })}
      <circle cx={30} cy={30} r={3} fill={color} />
    </svg>
  );
}

export function LaurelMotif({ size = 22, color = MOTIF_COLOR, style }: BaseMotifProps) {
  const leaf = (cx: number, cy: number, r: number, key: number) => (
    <ellipse
      key={key}
      cx={cx}
      cy={cy}
      rx={3.4}
      ry={7}
      fill={color}
      opacity={0.9}
      transform={`rotate(${r} ${cx} ${cy})`}
    />
  );
  const leaves: Array<[number, number, number]> = [
    [24, 58, 30],
    [20, 46, 40],
    [19, 34, 55],
    [23, 22, 70],
    [56, 58, -30],
    [60, 46, -40],
    [61, 34, -55],
    [57, 22, -70],
  ];
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} style={style} aria-hidden="true">
      <path d="M40 74 C 18 66, 14 36, 26 12" fill="none" stroke={color} strokeWidth={1.5} />
      <path d="M40 74 C 62 66, 66 36, 54 12" fill="none" stroke={color} strokeWidth={1.5} />
      {leaves.map(([cx, cy, r], i) => leaf(cx, cy, r, i))}
    </svg>
  );
}

export function DecoFan({ size = 22, color = MOTIF_COLOR, style }: BaseMotifProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={style} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={`a-${i}`}
          d={`M32 56 A 30 30 0 0 1 ${32 - 26 + i * 13} ${56 - Math.sqrt(Math.max(0, 900 - (26 - i * 13) ** 2))}`}
          fill="none"
          stroke={color}
          strokeWidth={1.6}
        />
      ))}
      {[-26, -13, 0, 13, 26].map((dx, i) => (
        <line
          key={`l-${i}`}
          x1={32}
          y1={56}
          x2={32 + dx}
          y2={56 - Math.sqrt(Math.max(0, 900 - dx * dx))}
          stroke={color}
          strokeWidth={1.4}
        />
      ))}
      <circle cx={32} cy={56} r={2.4} fill={color} />
    </svg>
  );
}

export function PalmMotif({ size = 22, color = MOTIF_COLOR, flip = false, style }: DirectionalMotifProps) {
  return (
    <svg
      viewBox="0 0 70 80"
      width={size * 0.88}
      height={size}
      style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }}
      aria-hidden="true"
    >
      <path d="M35 78 C 34 54, 33 30, 35 10" fill="none" stroke={color} strokeWidth={1.8} />
      {[-58, -34, -12, 12, 34, 58].map((deg, i) => (
        <path
          key={i}
          d="M35 12 Q 50 14 64 6"
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          transform={`rotate(${deg} 35 12)`}
        />
      ))}
    </svg>
  );
}

/* ─── Custom motifs (new) ─────────────────────────────────────────
   Each follows the established signature: { size, color, style? }
   and binds via MOTIF_COLOR by default so theme accent flows in.
   Targets occasions the original 12 didn't fit well — mountain
   retreats, coastal summers, anniversaries, memorials, bachelor/
   ette parties, fall/winter events. */

export function MountainMotif({ size = 28, color = MOTIF_COLOR, style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 40" width={size} height={size * (40 / 60)} style={style} aria-hidden>
      {/* Three overlapping peaks — back-far-light, middle-mid, front-dark. */}
      <path d="M0 36 L18 10 L30 26 L42 6 L60 36 Z" fill={color} opacity="0.16" />
      <path d="M6 36 L22 14 L34 28 L60 36 Z" fill={color} opacity="0.34" />
      <path d="M0 36 L14 18 L24 30 L36 16 L48 30 L60 36 Z" fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Tiny sun behind the back peak. */}
      <circle cx="44" cy="10" r="3" fill={color} opacity="0.45" />
    </svg>
  );
}

export function WaveCurl({ size = 38, color = MOTIF_COLOR, style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 80 28" width={size} height={size * (28 / 80)} style={style} aria-hidden>
      {/* Single brush-flick wave — fades on entry and exit to read
          as ink-on-paper rather than line. */}
      <defs>
        <linearGradient id="wc-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="15%" stopColor={color} stopOpacity="1" />
          <stop offset="85%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M2 14 C 14 4, 22 24, 34 14 S 56 4, 66 14 S 76 18, 78 14"
        stroke="url(#wc-grad)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function RoseMotif({ size = 28, color = MOTIF_COLOR, style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 36 60" width={size * (36 / 60)} height={size} style={style} aria-hidden>
      {/* Rose head — concentric spiral. */}
      <circle cx="18" cy="14" r="11" fill={color} opacity="0.18" />
      <path d="M18 6 C 22 6, 26 10, 24 14 C 22 18, 14 18, 12 14 C 10 10, 14 6, 18 6"
        fill="none" stroke={color} strokeWidth="1.2" />
      <path d="M18 9 C 21 9, 23 12, 21 15 C 19 17, 15 16, 14 14"
        fill="none" stroke={color} strokeWidth="1.2" />
      <circle cx="18" cy="13" r="2" fill={color} />
      {/* Stem + thorn. */}
      <path d="M18 24 L18 56" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M18 38 L13 35" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      {/* Single leaf. */}
      <path d="M18 32 Q 26 28, 28 36 Q 22 38, 18 36 Z" fill={color} opacity="0.4" />
    </svg>
  );
}

export function CrescentMotif({ size = 24, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} style={style} aria-hidden>
      {/* Crescent — large circle with a slightly-offset cutout. */}
      <defs>
        <mask id="cres-mask">
          <rect width="40" height="40" fill="white" />
          <circle cx="22" cy="18" r="13" fill="black" />
        </mask>
      </defs>
      <circle cx="18" cy="20" r="14" fill={color} mask="url(#cres-mask)" />
      {/* Twinkle star. */}
      <g transform="translate(31 30)" fill={gold}>
        <path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" />
      </g>
    </svg>
  );
}

export function DoveMotif({ size = 30, color = MOTIF_COLOR, style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 40" width={size} height={size * (40 / 60)} style={style} aria-hidden>
      {/* Abstract dove — body + wing arc + tail. */}
      <path d="M8 22 Q 18 12, 30 16 Q 40 18, 50 14 Q 44 22, 36 24 Q 24 28, 14 28 Z" fill={color} opacity="0.2" />
      <path d="M8 22 Q 18 12, 30 16 Q 40 18, 50 14" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M30 16 Q 28 26, 22 30" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      {/* Beak + eye. */}
      <path d="M50 14 L54 12 L52 16 Z" fill={color} opacity="0.5" />
      <circle cx="48" cy="16" r="0.8" fill={color} />
      {/* Olive branch in beak — single tiny leaf. */}
      <path d="M54 12 Q 58 10, 60 14" fill="none" stroke="var(--t-gold, var(--gold, #B8935A))" strokeWidth="0.8" />
    </svg>
  );
}

export function ArrowsMotif({ size = 28, color = MOTIF_COLOR, style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 50 50" width={size} height={size} style={style} aria-hidden>
      {/* Crossed arrows — heritage / camp aesthetic. */}
      <g stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none">
        <line x1="6" y1="6" x2="44" y2="44" />
        <line x1="44" y1="6" x2="6" y2="44" />
        {/* Fletching on each shaft end. */}
        <path d="M6 6 L10 4 M6 6 L4 10" />
        <path d="M44 6 L48 8 M44 6 L42 10" />
        {/* Arrowheads. */}
        <path d="M44 44 L40 42 L42 38" fill={color} />
        <path d="M6 44 L8 38 L10 42" fill={color} />
      </g>
    </svg>
  );
}

export function PineconeMotif({ size = 30, color = MOTIF_COLOR, style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 30 50" width={size * (30 / 50)} height={size} style={style} aria-hidden>
      {/* Pinecone — overlapping scales arranged in two zigzag rows. */}
      <g fill={color} opacity="0.65">
        {[0, 1, 2, 3, 4].map((row) => (
          <g key={row} transform={`translate(0 ${10 + row * 6})`}>
            {[6, 14, 22].map((cx, i) => (
              <ellipse key={i} cx={cx + (row % 2 === 0 ? 0 : 4)} cy={0} rx={5} ry={3.5} />
            ))}
          </g>
        ))}
      </g>
      {/* Top sprig — three needles. */}
      <g stroke={color} strokeWidth="1.2" strokeLinecap="round">
        <line x1="15" y1="10" x2="9" y2="2" />
        <line x1="15" y1="10" x2="15" y2="0" />
        <line x1="15" y1="10" x2="21" y2="2" />
      </g>
    </svg>
  );
}

export function ButterflyMotif({ size = 28, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 50" width={size} height={size * (50 / 60)} style={style} aria-hidden>
      {/* Two pairs of wings — upper teardrops, lower scallops.
          Body is a thin oval down the middle. */}
      <g fill={color} opacity="0.4">
        <path d="M30 24 Q 8 6, 4 18 Q 10 28, 30 26 Z" />
        <path d="M30 24 Q 52 6, 56 18 Q 50 28, 30 26 Z" />
      </g>
      <g fill={color} opacity="0.6">
        <path d="M30 26 Q 14 36, 16 44 Q 24 42, 30 30 Z" />
        <path d="M30 26 Q 46 36, 44 44 Q 36 42, 30 30 Z" />
      </g>
      {/* Body. */}
      <ellipse cx="30" cy="26" rx="1.6" ry="13" fill={color} />
      <circle cx="30" cy="14" r="2" fill={color} />
      {/* Antennae. */}
      <path d="M30 12 Q 26 6, 24 4" fill="none" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M30 12 Q 34 6, 36 4" fill="none" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
      {/* Spots on upper wings. */}
      <circle cx="16" cy="18" r="1.4" fill={gold} />
      <circle cx="44" cy="18" r="1.4" fill={gold} />
    </svg>
  );
}

/* ── 2026-06-09 collection ─────────────────────────────────────────── */

/** Open magnolia bloom in three-quarter view — cupped outer petals,
 *  upright inner pair, gold stamen. Reads "southern porch in May". */
export function MagnoliaMotif({ size = 32, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {/* Branch stub entering from lower-left. */}
      <path d="M8 52 Q 18 46, 26 40" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Cupped outer petals — wide bowl. */}
      <path d="M14 36 Q 16 22, 30 20 Q 28 34, 14 36 Z" fill={color} opacity="0.28" />
      <path d="M46 36 Q 44 22, 30 20 Q 32 34, 46 36 Z" fill={color} opacity="0.28" />
      <path d="M14 36 Q 16 22, 30 20" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M46 36 Q 44 22, 30 20" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M14 36 Q 30 44, 46 36" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      {/* Upright inner petals. */}
      <path d="M24 30 Q 24 14, 30 8 Q 33 16, 31 29 Z" fill={color} opacity="0.5" />
      <path d="M36 30 Q 38 16, 34 9 Q 31 17, 32 29 Z" fill={color} opacity="0.36" />
      <path d="M24 30 Q 24 14, 30 8" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M36 30 Q 38 16, 34 9" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      {/* Gold stamen peeking from the bowl. */}
      <circle cx="30" cy="32" r="2.6" fill={gold} />
      {/* One glossy leaf under the bloom. */}
      <ellipse cx="42" cy="46" rx="7" ry="3" fill={color} opacity="0.55" transform="rotate(-24 42 46)" />
    </svg>
  );
}

/** Gingko fan leaf — split notch, radiating veins, slender stem. */
export function GingkoMotif({ size = 30, color = MOTIF_COLOR, style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {/* Fan blade — two lobes meeting at the centre notch. */}
      <path
        d="M30 38 C 12 36, 6 24, 10 10 C 20 16, 27 16, 29 24 L 30 20 L 31 24 C 33 16, 40 16, 50 10 C 54 24, 48 36, 30 38 Z"
        fill={color}
        opacity="0.34"
      />
      <path
        d="M30 38 C 12 36, 6 24, 10 10 C 20 16, 27 16, 29 24 L 30 20 L 31 24 C 33 16, 40 16, 50 10 C 54 24, 48 36, 30 38 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {/* Radiating veins. */}
      <g stroke={color} strokeWidth="0.8" opacity="0.7" strokeLinecap="round">
        <path d="M30 36 L 16 24" fill="none" />
        <path d="M30 36 L 23 18" fill="none" />
        <path d="M30 36 L 37 18" fill="none" />
        <path d="M30 36 L 44 24" fill="none" />
      </g>
      {/* Stem with a soft curve. */}
      <path d="M30 38 Q 29 48, 24 54" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Champagne coupe with rising gold bubbles — the toast, distilled. */
export function ChampagneMotif({ size = 30, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {/* Shallow coupe bowl. */}
      <path d="M14 18 L 46 18 Q 45 32, 30 33 Q 15 32, 14 18 Z" fill={color} opacity="0.18" />
      <path d="M14 18 L 46 18 Q 45 32, 30 33 Q 15 32, 14 18 Z" fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      {/* Pour line. */}
      <path d="M17 22 Q 30 26, 43 22" fill="none" stroke={color} strokeWidth="0.9" opacity="0.65" />
      {/* Stem + foot. */}
      <path d="M30 33 L 30 47" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M21 50 Q 30 46, 39 50" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Bubbles drifting up and off the rim. */}
      <circle cx="26" cy="12" r="1.5" fill={gold} />
      <circle cx="33" cy="8" r="1.1" fill={gold} opacity="0.85" />
      <circle cx="39" cy="13" r="1.8" fill={gold} opacity="0.9" />
    </svg>
  );
}

/** Paper lantern — ribbed body, caps, tassel, gold glow. */
export function LanternMotif({ size = 30, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {/* Hanging cord. */}
      <path d="M30 2 L 30 8" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      {/* Caps. */}
      <rect x="24" y="8" width="12" height="3.4" rx="1.6" fill={color} opacity="0.85" />
      <rect x="24" y="42" width="12" height="3.4" rx="1.6" fill={color} opacity="0.85" />
      {/* Body. */}
      <ellipse cx="30" cy="27" rx="15" ry="17" fill={gold} opacity="0.16" />
      <ellipse cx="30" cy="27" rx="15" ry="17" fill="none" stroke={color} strokeWidth="1.4" />
      {/* Ribs — vertical ellipses narrowing toward the edge. */}
      <ellipse cx="30" cy="27" rx="9.5" ry="17" fill="none" stroke={color} strokeWidth="0.8" opacity="0.6" />
      <ellipse cx="30" cy="27" rx="3.8" ry="17" fill="none" stroke={color} strokeWidth="0.8" opacity="0.6" />
      {/* Warm glow core. */}
      <circle cx="30" cy="27" r="3" fill={gold} opacity="0.9" />
      {/* Tassel. */}
      <path d="M30 45.4 L 30 52 M 27.5 52.5 L 30 52 L 32.5 52.5 M 28.5 56 L 30 52 L 31.5 56" fill="none" stroke={gold} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

/** Compass rose — four-point star, ring, gold heart. North runs long. */
export function CompassMotif({ size = 30, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {/* Outer ring with cardinal ticks. */}
      <circle cx="30" cy="32" r="20" fill="none" stroke={color} strokeWidth="1.1" opacity="0.75" />
      <g stroke={color} strokeWidth="1" opacity="0.7">
        <path d="M30 9.5 L 30 12.5" /><path d="M30 51.5 L 30 54.5" />
        <path d="M7.5 32 L 10.5 32" /><path d="M49.5 32 L 52.5 32" />
      </g>
      {/* Needle star — long north point, filled east-west halves. */}
      <path d="M30 14 L 33.5 28.5 L 30 32 Z" fill={color} />
      <path d="M30 14 L 26.5 28.5 L 30 32 Z" fill={color} opacity="0.45" />
      <path d="M30 50 L 33 35.5 L 30 32 Z" fill={color} opacity="0.45" />
      <path d="M30 50 L 27 35.5 L 30 32 Z" fill={color} />
      <path d="M12 32 L 26.5 29 L 30 32 L 26.5 35 Z" fill={color} opacity="0.3" />
      <path d="M48 32 L 33.5 29 L 30 32 L 33.5 35 Z" fill={color} opacity="0.3" />
      {/* Gold pivot. */}
      <circle cx="30" cy="32" r="2.4" fill={gold} />
    </svg>
  );
}

/** Peony — three ruffled petal rings around a gold stamen cluster. */
export function PeonyMotif({ size = 32, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  const outer = [0, 60, 120, 180, 240, 300];
  const mid = [30, 102, 174, 246, 318];
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      <g transform="translate(30 30)">
        {/* Outer ruffle — wide soft petals. */}
        {outer.map((a) => (
          <path
            key={`o${a}`}
            d="M0 -22 C 7 -20, 9 -10, 0 -6 C -9 -10, -7 -20, 0 -22 Z"
            fill={color}
            opacity="0.3"
            stroke={color}
            strokeWidth="0.8"
            transform={`rotate(${a})`}
          />
        ))}
        {/* Mid ring — offset half a step, slightly deeper. */}
        {mid.map((a) => (
          <path
            key={`m${a}`}
            d="M0 -14 C 5 -12.5, 6 -6, 0 -3.5 C -6 -6, -5 -12.5, 0 -14 Z"
            fill={color}
            opacity="0.55"
            transform={`rotate(${a})`}
          />
        ))}
        {/* Stamen cluster. */}
        <circle r="3" fill={gold} />
        <circle cx="2.6" cy="-2" r="1" fill={gold} opacity="0.8" />
        <circle cx="-2.6" cy="-1.6" r="1" fill={gold} opacity="0.8" />
        <circle cx="0.4" cy="2.8" r="1" fill={gold} opacity="0.8" />
      </g>
    </svg>
  );
}

/** Trailing ivy vine — S-curve stem, alternating leaves, tendril curl. */
export function VineMotif({ size = 44, color = MOTIF_COLOR, flip = false, style }: DirectionalMotifProps) {
  return (
    <svg viewBox="0 0 100 60" width={size} height={size * 0.6} style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }} aria-hidden="true">
      {/* Main stem — lazy S. */}
      <path d="M4 50 C 28 52, 38 30, 58 28 C 74 26, 80 16, 92 12" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Tendril curl off the tip. */}
      <path d="M92 12 C 97 10, 98 15, 94 16 C 91 17, 91 13, 93 13" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" />
      {/* Heart-ish ivy leaves, alternating sides. */}
      <path d="M22 49 C 16 41, 22 35, 27 39 C 32 35, 38 41, 31 48 C 28 51, 25 51, 22 49 Z" fill={color} opacity="0.55" transform="rotate(-10 27 44)" />
      <path d="M44 32 C 40 25, 45 20, 49 23 C 53 20, 58 25, 52 31 C 49 34, 47 34, 44 32 Z" fill={color} opacity="0.42" transform="rotate(8 49 27) scale(0.85)" />
      <path d="M66 26 C 62 20, 66 16, 70 18 C 74 16, 78 20, 73 25 C 70 28, 68 28, 66 26 Z" fill={color} opacity="0.55" transform="rotate(-6 70 22) scale(0.8)" />
    </svg>
  );
}

/** Retro starburst — alternating long/short rays, gold heart, satellites. */
export function StarburstMotif({ size = 28, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      <g stroke={color} strokeWidth="1.4" strokeLinecap="round">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const long = i % 2 === 0;
          const r1 = 6;
          const r2 = long ? 22 : 13;
          return (
            <line
              key={i}
              x1={30 + Math.cos(a) * r1}
              y1={30 + Math.sin(a) * r1}
              x2={30 + Math.cos(a) * r2}
              y2={30 + Math.sin(a) * r2}
              opacity={long ? 1 : 0.65}
            />
          );
        })}
      </g>
      <circle cx="30" cy="30" r="3" fill={gold} />
      {/* Two satellite sparks for the retro feel. */}
      <circle cx="49" cy="14" r="1.6" fill={color} opacity="0.7" />
      <circle cx="12" cy="47" r="1.3" fill={color} opacity="0.7" />
    </svg>
  );
}

/** Tied ribbon bow — two loops, trailing tails, gold knot. */
export function RibbonMotif({ size = 34, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 70 60" width={size} height={size * 0.86} style={style} aria-hidden="true">
      {/* Loops. */}
      <path d="M32 24 C 20 10, 6 14, 10 24 C 13 31, 25 30, 32 24 Z" fill={color} opacity="0.32" />
      <path d="M38 24 C 50 10, 64 14, 60 24 C 57 31, 45 30, 38 24 Z" fill={color} opacity="0.32" />
      <path d="M32 24 C 20 10, 6 14, 10 24 C 13 31, 25 30, 32 24 Z" fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M38 24 C 50 10, 64 14, 60 24 C 57 31, 45 30, 38 24 Z" fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      {/* Tails with notched ends. */}
      <path d="M33 27 C 28 38, 26 44, 21 50 L 27 48 L 28 54" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M37 27 C 42 38, 44 44, 49 50 L 43 48 L 42 54" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Knot. */}
      <rect x="31" y="20.5" width="8" height="7.5" rx="2.6" fill={gold} />
    </svg>
  );
}

/** Hummingbird at sip — swept wing, fanned tail, gold nectar dot. */
export function HummingbirdMotif({ size = 32, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {/* Body — plump teardrop pitched toward the flower. */}
      <path d="M22 28 C 28 20, 38 20, 42 27 C 44 31, 42 35, 37 36 C 30 38, 24 35, 22 28 Z" fill={color} opacity="0.5" />
      <path d="M22 28 C 28 20, 38 20, 42 27 C 44 31, 42 35, 37 36 C 30 38, 24 35, 22 28 Z" fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Head + eye. */}
      <circle cx="43" cy="26" r="4.6" fill={color} opacity="0.85" />
      <circle cx="44.6" cy="24.8" r="0.9" fill="var(--t-paper, #FBF7EE)" />
      {/* Long sipping beak. */}
      <path d="M47 28 L 57 33" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      {/* Swept-back wing, mid-beat. */}
      <path d="M30 27 C 24 16, 14 10, 6 10 C 12 20, 18 27, 28 30 Z" fill={color} opacity="0.32" />
      <path d="M30 27 C 24 16, 14 10, 6 10 C 12 20, 18 27, 28 30 Z" fill="none" stroke={color} strokeWidth="1.1" strokeLinejoin="round" />
      {/* Fanned tail. */}
      <path d="M23 33 C 16 38, 12 44, 10 49 M 24 35 C 20 40, 18 45, 17 50" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      {/* Gold nectar bloom at the beak tip. */}
      <circle cx="58" cy="34" r="1.8" fill={gold} />
      <circle cx="55" cy="37" r="1.1" fill={gold} opacity="0.7" />
    </svg>
  );
}

/* ── 2026-06-09 collection II ──────────────────────────────────────── */

/** Phalaenopsis orchid in profile — two broad wing petals, smaller
 *  upright top petal, the signature gold lip, arched stem + one bud. */
export function OrchidMotif({ size = 32, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {/* Arched stem rising from lower-left to the bloom. */}
      <path d="M10 56 C 13 46, 17 36, 27 29" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Waiting bud on the stem, with a sepal tick. */}
      <ellipse cx="15" cy="43" rx="2.2" ry="3.4" fill={color} opacity="0.5" transform="rotate(24 15 43)" />
      <path d="M15.6 46 L 13.6 48.4" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      {/* Broad wing petals — washed fill under a hairline. */}
      <path d="M30 24 C 18 13, 7 19, 12 28 C 15 33, 25 31, 30 24 Z" fill={color} opacity="0.34" />
      <path d="M30 24 C 42 13, 53 19, 48 28 C 45 33, 35 31, 30 24 Z" fill={color} opacity="0.34" />
      <path d="M30 24 C 18 13, 7 19, 12 28 C 15 33, 25 31, 30 24" fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M30 24 C 42 13, 53 19, 48 28 C 45 33, 35 31, 30 24" fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Smaller upright top petal. */}
      <path d="M30 23 C 26.5 16, 27 9, 30 5 C 33 9, 33.5 16, 30 23 Z" fill={color} opacity="0.5" />
      <path d="M30 23 C 26.5 16, 27 9, 30 5 C 33 9, 33.5 16, 30 23" fill="none" stroke={color} strokeWidth="1.1" strokeLinejoin="round" />
      {/* Gold lip — the orchid's landing platform, with two whiskers. */}
      <path d="M30 24.5 C 26.8 25.5, 26.4 29.5, 30 31 C 33.6 29.5, 33.2 25.5, 30 24.5 Z" fill={gold} />
      <path d="M30 31 L 28.4 33.6 M30 31 L 31.6 33.6" stroke={gold} strokeWidth="0.9" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Monstera deliciosa leaf — heart outline with four edge splits, two
 *  fenestration windows along the midrib, hairline veins, short stem. */
export function MonsteraMotif({ size = 32, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  /* Heart-shaped blade, tip at bottom; two split cuts per side run
     from the edge toward the midrib. */
  const blade =
    'M30 48 C 24 46, 19 43, 16 39 L 25 35 L 12 32 C 10 27, 10 21, 13 16 L 24 20 L 17 11 ' +
    'C 20 8, 25 8, 29 11 L 30 13 L 31 11 C 35 8, 40 8, 43 11 L 36 20 L 47 16 ' +
    'C 50 21, 50 27, 48 32 L 35 35 L 44 39 C 41 43, 36 46, 30 48 Z';
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {/* Short stem. */}
      <path d="M30 48 L 30 57" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d={blade} fill={color} opacity="0.3" />
      <path d={blade} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      {/* Midrib + paired side veins. */}
      <path d="M30 14 L 30 46" stroke={color} strokeWidth="1" opacity="0.75" fill="none" />
      <g stroke={color} strokeWidth="0.7" opacity="0.55" fill="none" strokeLinecap="round">
        <path d="M30 22 L 20 17" /><path d="M30 22 L 40 17" />
        <path d="M30 30 L 19 27" /><path d="M30 30 L 41 27" />
        <path d="M30 38 L 21 36" /><path d="M30 38 L 39 36" />
      </g>
      {/* Fenestration windows — punched back to the paper. */}
      <ellipse cx="24.5" cy="25" rx="1.9" ry="3.2" fill="var(--t-paper, var(--paper, #FBF7EE))" stroke={color} strokeWidth="0.8" transform="rotate(18 24.5 25)" />
      <ellipse cx="36" cy="31" rx="1.7" ry="2.8" fill="var(--t-paper, var(--paper, #FBF7EE))" stroke={color} strokeWidth="0.8" transform="rotate(-16 36 31)" />
      {/* Gold dew drop resting on the right lobe. */}
      <circle cx="41" cy="23" r="1.6" fill={gold} />
    </svg>
  );
}

/** Two spiky holly leaves crossed at a stem point, three gold berries. */
export function HollyMotif({ size = 32, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  /* One spiked leaf pointing up from the local origin; concave waves
     between the spike tips give the classic holly edge. */
  const leaf =
    'M0 0 Q -5 -2, -7 -6 L -4 -8 Q -9 -11, -8 -16 L -4 -17 Q -8 -21, -6 -25 L 0 -30 ' +
    'L 6 -25 Q 8 -21, 4 -17 L 8 -16 Q 9 -11, 4 -8 L 7 -6 Q 5 -2, 0 0 Z';
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {[-32, 32].map((deg) => (
        <g key={deg} transform={`translate(30 41) rotate(${deg})`}>
          <path d={leaf} fill={color} opacity="0.32" />
          <path d={leaf} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M0 -3 L 0 -26" stroke={color} strokeWidth="0.8" opacity="0.6" fill="none" />
        </g>
      ))}
      {/* Stem point. */}
      <path d="M30 41 L 30 46" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      {/* Gold berry cluster at the crossing. */}
      <circle cx="26.6" cy="46" r="2.6" fill={gold} />
      <circle cx="33.4" cy="46" r="2.6" fill={gold} opacity="0.9" />
      <circle cx="30" cy="50.4" r="2.6" fill={gold} opacity="0.8" />
    </svg>
  );
}

/** Sakura branch fragment — angular twig, two five-petal blossoms with
 *  the notched petal tip, one bud; gold stamen dots at the hearts. */
export function CherryBlossomMotif({ size = 32, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  /* Petal with the characteristic notch — tip dips at (0,-7) between
     two points at (±3.8,-8.6). */
  const petal = 'M0 0 C 3 -1.5, 4.6 -5, 3.8 -8.6 L 0 -7 L -3.8 -8.6 C -4.6 -5, -3 -1.5, 0 0 Z';
  const bloom = (cx: number, cy: number, s: number, key: string) => (
    <g key={key} transform={`translate(${cx} ${cy}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d={petal} fill={color} opacity="0.4" />
          <path d={petal} fill="none" stroke={color} strokeWidth="1" strokeLinejoin="round" />
        </g>
      ))}
      {/* Gold stamen heart. */}
      <circle r="1.5" fill={gold} />
      {[30, 150, 270].map((a) => (
        <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 3.4} cy={Math.sin((a * Math.PI) / 180) * 3.4} r="0.7" fill={gold} opacity="0.85" />
      ))}
    </g>
  );
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {/* Angular twig with short spurs to each bloom and the bud. */}
      <path d="M6 53 L 16 44 L 28 38 L 38 28 L 48 17" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 44 L 17 37 M38 28 L 41 22 M28 38 L 35 42" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      {bloom(18, 30, 1.15, 'a')}
      {bloom(42, 15, 0.9, 'b')}
      {/* Bud — still folded, with two sepal ticks. */}
      <ellipse cx="37" cy="43" rx="2.4" ry="3.1" fill={color} opacity="0.45" transform="rotate(-30 37 43)" />
      <ellipse cx="37" cy="43" rx="2.4" ry="3.1" fill="none" stroke={color} strokeWidth="0.9" transform="rotate(-30 37 43)" />
      <path d="M35.8 45.4 L 34.4 47.4 M38 45.6 L 38.4 48" fill="none" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

/** Classic anchor — gold ring, stock crossbar, shank, two curved arms
 *  with pointed flukes, and a rope curve threading the ring. */
export function AnchorMotif({ size = 30, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {/* Rope threading behind the ring. */}
      <path d="M8 4 C 18 2, 23 12, 33 9 C 41 6.5, 47 12, 52 18" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      {/* Gold ring. */}
      <circle cx="30" cy="11" r="4" fill="none" stroke={gold} strokeWidth="1.5" />
      {/* Shank + stock crossbar. */}
      <path d="M30 15 L 30 49" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 21 L 40 21" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Arms sweeping up from the crown. */}
      <path d="M30 49 C 21 49, 13 43, 11 33" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 49 C 39 49, 47 43, 49 33" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Pointed flukes. */}
      <path d="M11 33 L 6.5 38.5 L 14.5 37.5 Z" fill={color} opacity="0.55" stroke={color} strokeWidth="1" strokeLinejoin="round" />
      <path d="M49 33 L 53.5 38.5 L 45.5 37.5 Z" fill={color} opacity="0.55" stroke={color} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

/** Disco ball — faceted sphere (3 latitude + 4 longitude arcs), hanger
 *  link, and three sparks thrown off to the right (one gold). */
export function DiscoMotif({ size = 30, color = MOTIF_COLOR, gold = 'var(--t-gold, var(--gold, #B8935A))', style }: { size?: number; color?: string; gold?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={style} aria-hidden="true">
      {/* Hanger link. */}
      <path d="M30 16 L 30 11" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="30" cy="8" r="2.4" fill="none" stroke={color} strokeWidth="1.1" />
      {/* Ball. */}
      <circle cx="30" cy="32" r="16" fill={color} opacity="0.12" />
      <circle cx="30" cy="32" r="16" fill="none" stroke={color} strokeWidth="1.4" />
      {/* Facet grid — latitudes bow with the sphere… */}
      <g fill="none" stroke={color} strokeWidth="0.9" opacity="0.65">
        <path d="M16.1 24 A 13.9 4.4 0 0 0 43.9 24" />
        <path d="M14 32 A 16 5 0 0 0 46 32" />
        <path d="M16.1 40 A 13.9 4.4 0 0 0 43.9 40" />
        {/* …longitudes wrap pole to pole. */}
        <path d="M30 16 A 5 16 0 0 0 30 48" />
        <path d="M30 16 A 11 16 0 0 0 30 48" />
        <path d="M30 16 A 5 16 0 0 1 30 48" />
        <path d="M30 16 A 11 16 0 0 1 30 48" />
      </g>
      {/* Sparks thrown off to the right. */}
      <circle cx="50" cy="20" r="1.3" fill={color} opacity="0.7" />
      <circle cx="55" cy="28" r="1.1" fill={color} opacity="0.6" />
      <circle cx="52" cy="13" r="1.7" fill={gold} />
    </svg>
  );
}

export function Motif({ kind, size, style }: { kind: MotifKind; size?: number; style?: CSSProperties }) {
  switch (kind) {
    case 'olive':
      return <OliveSprig size={size} style={style} />;
    case 'bloom':
      return <WatercolorBloom size={size} style={style} />;
    case 'pressed':
      return <PressedFlower size={size} style={style} />;
    case 'lemon':
      return <Lemon size={size} style={style} />;
    case 'sun':
      return <SunMotif size={size} style={style} />;
    case 'wheat':
      return <WheatMotif size={size} style={style} />;
    case 'fern':
      return <FernMotif size={size} style={style} />;
    case 'shell':
      return <ShellMotif size={size} style={style} />;
    case 'citrus':
      return <CitrusMotif size={size} style={style} />;
    case 'laurel':
      return <LaurelMotif size={size} style={style} />;
    case 'deco-fan':
      return <DecoFan size={size} style={style} />;
    case 'palm':
      return <PalmMotif size={size} style={style} />;
    case 'mountain':
      return <MountainMotif size={size} style={style} />;
    case 'wave-curl':
      return <WaveCurl size={size} style={style} />;
    case 'rose':
      return <RoseMotif size={size} style={style} />;
    case 'crescent':
      return <CrescentMotif size={size} style={style} />;
    case 'dove':
      return <DoveMotif size={size} style={style} />;
    case 'arrows':
      return <ArrowsMotif size={size} style={style} />;
    case 'pinecone':
      return <PineconeMotif size={size} style={style} />;
    case 'butterfly':
      return <ButterflyMotif size={size} style={style} />;
    case 'magnolia':
      return <MagnoliaMotif size={size} style={style} />;
    case 'gingko':
      return <GingkoMotif size={size} style={style} />;
    case 'champagne':
      return <ChampagneMotif size={size} style={style} />;
    case 'lantern':
      return <LanternMotif size={size} style={style} />;
    case 'compass':
      return <CompassMotif size={size} style={style} />;
    case 'peony':
      return <PeonyMotif size={size} style={style} />;
    case 'vine':
      return <VineMotif size={size} style={style} />;
    case 'starburst':
      return <StarburstMotif size={size} style={style} />;
    case 'ribbon':
      return <RibbonMotif size={size} style={style} />;
    case 'hummingbird':
      return <HummingbirdMotif size={size} style={style} />;
    case 'orchid':
      return <OrchidMotif size={size} style={style} />;
    case 'monstera':
      return <MonsteraMotif size={size} style={style} />;
    case 'holly':
      return <HollyMotif size={size} style={style} />;
    case 'cherry-blossom':
      return <CherryBlossomMotif size={size} style={style} />;
    case 'anchor':
      return <AnchorMotif size={size} style={style} />;
    case 'disco':
      return <DiscoMotif size={size} style={style} />;
    case 'none':
    default:
      return null;
  }
}

interface MotifScatterProps {
  motif?: MotifKind;
  density?: MotifDensity;
}

export function MotifScatter({ motif = 'none', density = 'sparse' }: MotifScatterProps) {
  if (!motif || motif === 'none' || density === 'none') return null;
  const sets: Record<'sparse' | 'generous', Array<{ kind: MotifKind; size: number; style: CSSProperties }>> = {
    sparse: [
      { kind: motif, size: 96, style: { top: 16, right: 22, opacity: 0.5 } },
    ],
    generous: [
      { kind: motif, size: 104, style: { top: 14, left: 18, opacity: 0.55, transform: 'scaleX(-1)' } },
      { kind: motif, size: 88, style: { bottom: 16, right: 24, opacity: 0.45 } },
    ],
  };
  const items = sets[density] || sets.sparse;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {items.map((it, i) => (
        <div key={i} style={{ position: 'absolute', ...it.style }}>
          <Motif kind={it.kind} size={it.size} />
        </div>
      ))}
      {motif === 'bloom' && (
        <div
          style={{
            position: 'absolute',
            bottom: 18,
            left: 26,
            opacity: 0.7,
            transform: 'rotate(-8deg)',
          }}
        >
          <Lemon size={44} />
        </div>
      )}
    </div>
  );
}
