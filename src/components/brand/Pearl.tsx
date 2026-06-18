import type { CSSProperties } from 'react';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/Pearl.tsx
//
// Pearl — the brand's gold pearl bead, the same one knotted into
// the logo's weft. Use it as inline punctuation beside headlines,
// inside CTAs, and as a list/status marker. Two looks: a flat SVG
// bead (default, crisp + themeable) or the iridescent shimmer dot
// (drives the `pl-pearl-shimmer` keyframe in globals.css).
// ─────────────────────────────────────────────────────────────

export interface PearlProps {
  size?: number;
  iridescent?: boolean;
  style?: CSSProperties;
}

export function Pearl({ size = 10, iridescent = false, style }: PearlProps) {
  if (iridescent) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: 999,
          background: 'linear-gradient(135deg, #F4ECD8 0%, #E8C77A 30%, #D9A89E 55%, #B8C96B 80%, #F4ECD8 100%)',
          backgroundSize: '200% 200%',
          animation: 'pl-pearl-shimmer 6s ease-in-out infinite',
          boxShadow: 'inset 0 0 4px rgba(255,255,255,0.4), 0 0 1px rgba(31,36,24,0.3)',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <circle cx="6" cy="6" r="4.4" fill="var(--pl-gold)" stroke="var(--pl-cream)" strokeWidth="1.4" />
    </svg>
  );
}
