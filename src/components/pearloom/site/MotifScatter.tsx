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

export function OliveSprig({ size = 90, color = 'var(--pl-olive, #5C6B3F)', berry = 'var(--gold, #B8935A)', flip = false, style }: OliveSprigProps) {
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

export function Lemon({ size = 44, color = 'var(--gold, #B8935A)', leaf = 'var(--pl-olive, #5C6B3F)', style }: LemonProps) {
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

export function PressedFlower({ size = 56, petal = 'var(--peach-ink, #C6703D)', center = 'var(--gold, #B8935A)', style }: PressedFlowerProps) {
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

export function WatercolorBloom({ size = 120, tone = 'var(--pl-olive, #5C6B3F)', tone2 = 'var(--peach-ink, #C6703D)', style }: WatercolorBloomProps) {
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
