'use client';

/* ════════════════════════════════════════════════════════════════
   AMBIENT MOTIFS — the marks pressed into the paper behind a page.

   The old ambient layer scaled a 24-unit Sprig icon up to 230px:
   at that magnification its filled leaf-ellipses melt into a gray
   caterpillar (the "smudge" hosts kept noticing on empty pages).
   These replacements are drawn ON large viewBoxes with hairline
   strokes, so at ambient scale they read as fine letterpress
   impressions in the paper — and each one MEANS something about
   the page it sits behind:

     AmbientSprig      — a real botanical: olive branch, outlined
                         leaves with midribs. Home / site pages.
     AmbientThread     — the brand's two-strand thread with a
                         pearl knotted on. Generic / settings.
     AmbientGathering  — one thread strung through small pearls:
                         the guest list, literally. Guests pages.
     AmbientHour       — a hairline clock whose hands are threads,
                         a pearl at the axis. Day-of pages.
     AmbientEnvelope   — stationery flap with a pearl wax seal.
                         Studio / invites / print pages.
     AmbientKeepsake   — photo-corner mounts + a pressed sprig:
                         an album page. Memory pages.

   All stroke-only (≈1.2 units on a 240-unit grid), intended for
   opacity 0.05–0.09 placement by PLAtmosphere.
   ════════════════════════════════════════════════════════════════ */

import type { CSSProperties } from 'react';

interface AmbientProps {
  size?: number;
  color?: string;
  accent?: string;
  className?: string;
  style?: CSSProperties;
}

const S = (p: AmbientProps) => ({
  width: p.size ?? 220,
  height: p.size ?? 220,
  className: p.className,
  style: p.style,
  'aria-hidden': true as const,
});

const stroke = (color: string, w = 1.3) => ({
  stroke: color,
  strokeWidth: w,
  fill: 'none' as const,
  strokeLinecap: 'round' as const,
});

/* One outlined leaf — a vesica with a midrib, tangent to angle θ. */
function Leaf({ x, y, r, a, c }: { x: number; y: number; r: number; a: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d={`M 0 0 C ${r * 0.35} ${-r * 0.5}, ${r * 0.75} ${-r * 0.5}, ${r} 0 C ${r * 0.75} ${r * 0.5}, ${r * 0.35} ${r * 0.5}, 0 0 Z`} {...stroke(c, 1.2)} />
      <path d={`M ${r * 0.16} 0 L ${r * 0.84} 0`} {...stroke(c, 0.9)} opacity={0.8} />
    </g>
  );
}

export function AmbientSprig({ color = 'var(--sage-deep, #5C6B3F)', accent, ...p }: AmbientProps) {
  const stem = accent ?? color;
  return (
    <svg viewBox="0 0 240 240" {...S(p)}>
      <path d="M 30 218 C 80 180, 120 130, 204 28" {...stroke(stem, 1.4)} />
      <Leaf x={56} y={196} r={34} a={-148} c={color} />
      <Leaf x={84} y={170} r={36} a={-28} c={color} />
      <Leaf x={112} y={140} r={34} a={-152} c={color} />
      <Leaf x={138} y={110} r={32} a={-34} c={color} />
      <Leaf x={162} y={82} r={28} a={-158} c={color} />
      <Leaf x={182} y={56} r={24} a={-40} c={color} />
      {/* one olive at the branch fork */}
      <circle cx={70} cy={186} r={4.6} {...stroke(color, 1.2)} />
    </svg>
  );
}

export function AmbientThread({ color = 'var(--sage-deep, #5C6B3F)', accent = 'var(--gold, #C19A4B)', ...p }: AmbientProps) {
  return (
    <svg viewBox="0 0 240 240" {...S(p)}>
      <path d="M 16 190 C 70 150, 90 210, 140 160 C 180 122, 170 70, 224 40" {...stroke(color, 1.3)} />
      <path d="M 16 198 C 72 158, 92 218, 142 168 C 182 130, 172 78, 224 48" {...stroke(accent, 1.1)} opacity={0.85} />
      <circle cx={141} cy={164} r={5} {...stroke(accent, 1.2)} />
    </svg>
  );
}

export function AmbientGathering({ color = 'var(--sage-deep, #5C6B3F)', accent = 'var(--gold, #C19A4B)', ...p }: AmbientProps) {
  /* One thread strung through pearls — the guest list, literally. */
  const pearls: Array<[number, number, number]> = [
    [36, 196, 6], [78, 168, 8], [118, 150, 6], [156, 122, 9], [188, 86, 6], [212, 50, 7],
  ];
  return (
    <svg viewBox="0 0 240 240" {...S(p)}>
      <path d="M 20 210 C 60 180, 100 168, 130 142 C 168 110, 190 80, 226 38" {...stroke(color, 1.2)} />
      {pearls.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} {...stroke(i % 2 ? accent : color, 1.2)} />
      ))}
    </svg>
  );
}

export function AmbientHour({ color = 'var(--sage-deep, #5C6B3F)', accent = 'var(--gold, #C19A4B)', ...p }: AmbientProps) {
  /* A hairline clock whose hands are loose threads. */
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const x1 = 120 + Math.sin(a) * 86;
    const y1 = 120 - Math.cos(a) * 86;
    const x2 = 120 + Math.sin(a) * 94;
    const y2 = 120 - Math.cos(a) * 94;
    return [x1, y1, x2, y2] as const;
  });
  return (
    <svg viewBox="0 0 240 240" {...S(p)}>
      <circle cx={120} cy={120} r={98} {...stroke(color, 1.3)} />
      {ticks.map(([x1, y1, x2, y2], i) => (
        <path key={i} d={`M ${x1} ${y1} L ${x2} ${y2}`} {...stroke(color, 1.1)} />
      ))}
      {/* thread hands — slightly slack curves, not rigid needles */}
      <path d="M 120 120 C 116 96, 122 70, 118 46" {...stroke(accent, 1.3)} />
      <path d="M 120 120 C 142 116, 160 108, 178 96" {...stroke(color, 1.3)} />
      <circle cx={120} cy={120} r={5} {...stroke(accent, 1.3)} />
    </svg>
  );
}

export function AmbientEnvelope({ color = 'var(--sage-deep, #5C6B3F)', accent = 'var(--gold, #C19A4B)', ...p }: AmbientProps) {
  return (
    <svg viewBox="0 0 240 240" {...S(p)}>
      <rect x={30} y={64} width={180} height={120} rx={6} {...stroke(color, 1.3)} />
      {/* flap */}
      <path d="M 30 70 L 120 138 L 210 70" {...stroke(color, 1.2)} />
      {/* pearl wax seal at the flap's point */}
      <circle cx={120} cy={138} r={9} {...stroke(accent, 1.3)} />
      <circle cx={120} cy={138} r={3} {...stroke(accent, 1)} />
    </svg>
  );
}

export function AmbientKeepsake({ color = 'var(--sage-deep, #5C6B3F)', accent = 'var(--gold, #C19A4B)', ...p }: AmbientProps) {
  /* An album page: photo-corner mounts + a small pressed sprig. */
  return (
    <svg viewBox="0 0 240 240" {...S(p)}>
      {/* four photo-corner mounts */}
      <path d="M 44 70 L 44 46 L 68 46" {...stroke(color, 1.3)} />
      <path d="M 172 46 L 196 46 L 196 70" {...stroke(color, 1.3)} />
      <path d="M 196 150 L 196 174 L 172 174" {...stroke(color, 1.3)} />
      <path d="M 68 174 L 44 174 L 44 150" {...stroke(color, 1.3)} />
      {/* the pressed sprig laid across the album page */}
      <path d="M 84 150 C 104 130, 124 110, 158 76" {...stroke(accent, 1.2)} />
      <Leaf x={100} y={134} r={22} a={-138} c={color} />
      <Leaf x={118} y={116} r={22} a={-24} c={color} />
      <Leaf x={136} y={96} r={19} a={-142} c={color} />
    </svg>
  );
}

export type AmbientContext = 'site' | 'guests' | 'day' | 'studio' | 'memory' | 'settings';

export function ambientFor(context: AmbientContext) {
  switch (context) {
    case 'guests': return AmbientGathering;
    case 'day': return AmbientHour;
    case 'studio': return AmbientEnvelope;
    case 'memory': return AmbientKeepsake;
    case 'settings': return AmbientThread;
    default: return AmbientSprig;
  }
}
