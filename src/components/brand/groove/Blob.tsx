'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/Blob.tsx
//
// A soft asymmetric blob — renders as a simple div with
// asymmetric border-radius + a gradient wash. Optionally
// morphs between three shapes on a 14s loop. Zero SVG, zero
// canvas, zero bundle weight.
//
// Use for: hero backgrounds, decorative accents behind
// headlines, dashboard hero chrome. DO NOT use on the
// published site — groove is product-UI only.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

type BlobPalette = 'sunrise' | 'orchard' | 'petal';

const PALETTE_VAR: Record<BlobPalette, string> = {
  sunrise: 'var(--pl-groove-blob-sunrise)',
  orchard: 'var(--pl-groove-blob-orchard)',
  petal:   'var(--pl-groove-blob-petal)',
};

interface BlobProps {
  palette?: BlobPalette;
  /** Size in px; blob is roughly square so this sets both dims. */
  size?: number;
  /** Adds the slow shapeshift animation. Respects reduced-motion. */
  morph?: boolean;
  /** Blur (px) for the soft atmosphere look. */
  blur?: number;
  /** Opacity multiplier (0–1). */
  opacity?: number;
  /** Optional absolute positioning. */
  style?: CSSProperties;
  className?: string;
  'aria-hidden'?: boolean;
}

export function GrooveBlob({
  palette = 'sunrise',
  size = 320,
  morph = true,
  blur = 0,
  opacity = 1,
  style,
  className,
  'aria-hidden': ariaHidden = true,
}: BlobProps) {
  return (
    <div
      aria-hidden={ariaHidden}
      className={[className, morph ? 'pl-groove-blob' : undefined].filter(Boolean).join(' ')}
      style={{
        width: size,
        height: size,
        background: PALETTE_VAR[palette],
        borderRadius: 'var(--pl-groove-radius-blob)',
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        opacity,
        animation: morph
          ? 'pl-groove-blob-morph 14s ease-in-out infinite'
          : undefined,
        ...style,
      }}
    />
  );
}
