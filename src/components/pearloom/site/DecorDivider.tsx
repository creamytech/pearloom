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
  /** Even instances flip vertically so two adjacent dividers don't
   *  read identical. Pass `index` from the block loop. */
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
  const flip = index % 2 === 1;

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
          transform: flip ? 'scaleY(-1)' : undefined,
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          opacity: 0.92,
          pointerEvents: 'none',
          ...style,
        }}
      />
    );
  }

  // Fallback Filigree — stroke-drawable on scroll-reveal. Each
  // index picks a different variant so adjacent dividers vary.
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
