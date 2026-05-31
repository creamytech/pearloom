// ─────────────────────────────────────────────────────────────
// MotifScatter — direct port of the prototype's MotifScatter
// (themed-site.jsx / themes.jsx). Renders decorative SVG motifs
// scattered in a section's corners.
//
// Motifs ported:
//   olive   — OliveSprig (curving stem with leaves + berries)
//   bloom   — WatercolorBloom (3-stop radial blobs with watercolor
//             SVG filter displacement, requires #t-watercolor)
//   pressed — PressedFlower (6-petal flower, centered)
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

export type MotifKind = 'olive' | 'bloom' | 'pressed' | 'none';
export type MotifDensity = 'none' | 'sparse' | 'generous';

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

function Motif({ kind, size, style }: { kind: MotifKind; size?: number; style?: CSSProperties }) {
  if (kind === 'olive') return <OliveSprig size={size} style={style} />;
  if (kind === 'bloom') return <WatercolorBloom size={size} style={style} />;
  if (kind === 'pressed') return <PressedFlower size={size} style={style} />;
  return null;
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
