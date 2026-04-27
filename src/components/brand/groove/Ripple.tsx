'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/Ripple.tsx
//
// Concentric CSS rings radiating from center — a warm halo
// behind hero visuals (the 3D pear, for one). Pure CSS, no
// WebGL, no canvas, honours prefers-reduced-motion.
//
// Pattern adapted from Magic UI's "Ripple" but rebuilt on
// --pl-groove-* tokens so it reads butter/terra instead of
// the neutral gray of the original.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

interface RippleProps {
  /** Number of concentric rings. Default 5. */
  count?: number;
  /** Smallest ring diameter (px). Default 120. */
  minSize?: number;
  /** How much each ring grows beyond the previous (px). Default 80. */
  step?: number;
  /** Ring colour — use the site's accent. */
  color?: string;
  /** Overall opacity multiplier. */
  opacity?: number;
  /** Centred container positioning. */
  style?: CSSProperties;
}

export function Ripple({
  count = 5,
  minSize = 120,
  step = 80,
  color = 'var(--pl-groove-butter)',
  opacity = 1,
  style,
}: RippleProps) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity,
        ...style,
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const size = minSize + i * step;
        // Inner rings are brighter; outer rings fade.
        const ringOpacity = Math.max(0.06, 0.32 - i * 0.05);
        const delay = i * 0.22;
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              border: `1px solid color-mix(in oklab, ${color} ${Math.round(ringOpacity * 100)}%, transparent)`,
              background: i === 0
                ? `radial-gradient(circle, color-mix(in oklab, ${color} 18%, transparent) 0%, transparent 70%)`
                : undefined,
              animation: `pl-groove-ripple-pulse 4.4s ease-out ${delay}s infinite`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes pl-groove-ripple-pulse {
          0%   { transform: scale(0.92); opacity: 0.9; }
          70%  { transform: scale(1.06); opacity: 0.2; }
          100% { transform: scale(1.1);  opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          span { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
