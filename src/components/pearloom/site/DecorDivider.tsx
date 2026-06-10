'use client';

/* ========================================================================
   DecorDivider — section divider between blocks.

   Two render modes:
     • If manifest.decorLibrary.divider is set, render that AI-generated
       PNG as a repeating band (the original behaviour, kept for
       templates that rely on it).
     • Otherwise render an inline SVG Filigree variant so every site
       gets a stroke-drawable hairline between sections — and so the
       divider can animate on scroll-reveal via stroke-dashoffset.

   The wrapper carries data-pl-stroke-draw so ScrollReveal triggers
   the draw-on animation when the divider enters the viewport.
   ======================================================================== */

import type { CSSProperties } from 'react';
import { Filigree } from '../motifs';

interface Props {
  url?: string;
  /** Index in the block loop — used to vary the inline-SVG fallback
   *  variant so adjacent dividers don't read identical. The raster
   *  divider used to flip on even instances; the user found that
   *  upside-down houses read as broken (Santorini divider has a
   *  clear "ground line"), so all instances are now upright. */
  index?: number;
  /** Renders dramatically smaller/softer — used between tighter sections. */
  compact?: boolean;
  /** 'subtle' | 'standard' | 'tall' — host-configurable height. */
  strength?: 'subtle' | 'standard' | 'tall';
  /** When true, the host has hidden this divider in the editor. */
  hidden?: boolean;
  style?: CSSProperties;
}

export function DecorDivider({ url, index = 0, compact, strength = 'standard', hidden, style }: Props) {
  if (hidden) return null;
  const baseHeight =
    strength === 'subtle' ? 44 :
    strength === 'tall' ? 120 :
    84;
  const height = compact ? Math.max(32, baseHeight - 28) : baseHeight;

  // AI-generated divider available — render the original raster band.
  if (url) {
    return (
      <div
        aria-hidden="true"
        className="pl8-decor-divider"
        style={{
          width: '100%',
          height,
          backgroundImage: `url(${url})`,
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'center',
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          // Blend + opacity adapt to theme via vars set per
          // Edition. Cinema (dark) uses screen so the divider
          // doesn't sink into the black; paper Editions use
          // multiply so any white-bg PNG halo blends out.
          mixBlendMode: 'var(--decor-blend, multiply)' as 'multiply',
          opacity: 'var(--decor-opacity, 0.92)' as unknown as number,
          pointerEvents: 'none',
          ...style,
        }}
      />
    );
  }

  // Default fallback — woven thread band. Two interlocking
  // strokes (olive + gold) with the brand's loom-shuttle motion
  // animating the dash offset. Reads as the "thread as the
  // visual atom" rule from BRAND.md §3 — once a guest sees it
  // three times they know they're in a Pearloom product.
  // Even-index instances flip the phase for variety; odd-index
  // instances pull a Filigree variant so the visual rhythm down
  // the page alternates thread / filigree / thread.
  if (index % 2 === 1) {
    return (
      <div
        aria-hidden="true"
        className="pl8-decor-divider"
        data-pl-stroke-draw
        style={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.65,
          pointerEvents: 'none',
          ...style,
        }}
      >
        <Filigree
          variant={index}
          width={Math.max(220, height * 4)}
          height={height * 0.7}
          strokeWidth={1.2}
        />
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className="pl8-decor-divider"
      data-pl-stroke-draw
      style={{
        width: '100%',
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.7,
        pointerEvents: 'none',
        ...style,
      }}
    >
      <ThreadWeave
        width={Math.max(260, height * 4)}
        height={height * 0.55}
        phaseOffset={index * 0.18}
      />
    </div>
  );
}

/** Two-strand woven thread divider — olive warp + gold weft.
 *  Each strand runs as a sine wave, offset 180° from the other
 *  so they cross every quarter-period. Stroke-dasharray + the
 *  pl-weave-travel keyframe scrolls a "pulse" of dash along the
 *  strand so it reads as a loom in motion. Honours
 *  prefers-reduced-motion via the global keyframe rule. */
function ThreadWeave({
  width,
  height,
  phaseOffset = 0,
}: {
  width: number;
  height: number;
  phaseOffset?: number;
}) {
  const cy = height / 2;
  const amp = Math.max(4, height * 0.22);
  const periods = 4;
  const period = width / periods;
  const phase = (phaseOffset * Math.PI * 2) % (Math.PI * 2);
  // Build the two paths — sin and -sin offset so they weave.
  const strand = (sign: 1 | -1) => {
    const steps = 60;
    let d = `M 0 ${cy + sign * amp * Math.sin(phase)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * width;
      const y = cy + sign * amp * Math.sin(phase + (i / steps) * periods * Math.PI * 2);
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="presentation"
    >
      <defs>
        <linearGradient id="pl-thread-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="14%" stopColor="rgba(0,0,0,1)" />
          <stop offset="86%" stopColor="rgba(0,0,0,1)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <mask id="pl-thread-mask">
          <rect width="100%" height="100%" fill="url(#pl-thread-fade)" />
        </mask>
      </defs>
      <g mask="url(#pl-thread-mask)" fill="none" strokeLinecap="round">
        {/* Olive warp */}
        <path
          d={strand(1)}
          stroke="var(--olive, #5C6B3F)"
          strokeWidth={1.4}
          strokeDasharray={`${period * 0.6} ${period * 0.4}`}
          pathLength={1}
          style={{
            // pathLength normalisation so the keyframe's 1 → -0.32
            // dashoffset travel works regardless of actual length.
            animation: 'pl-weave-travel 9s linear infinite',
          }}
        />
        {/* Gold weft, opposite phase + slower */}
        <path
          d={strand(-1)}
          stroke="var(--gold, #C19A4B)"
          strokeWidth={1.1}
          strokeDasharray={`${period * 0.45} ${period * 0.55}`}
          opacity={0.9}
          pathLength={1}
          style={{
            animation: 'pl-weave-travel 14s linear infinite reverse',
          }}
        />
        {/* Center dot — a single bead the threads weave through. */}
        <circle
          cx={width / 2}
          cy={cy}
          r={2.4}
          fill="var(--peach-ink, #C6703D)"
          opacity={0.7}
        />
      </g>
    </svg>
  );
}
