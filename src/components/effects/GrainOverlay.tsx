'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / effects/GrainOverlay.tsx
// Fixed-position film grain overlay using SVG feTurbulence.
// Renders as a pointer-events-none overlay in mix-blend-mode:overlay
// so it enriches the page without blocking clicks.
// intensity: 0 (off) → 100 (heavy grain)
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

interface GrainOverlayProps {
  intensity: number; // 0–100
}

// We animate the grain by shifting the SVG turbulence seed on a rAF loop
// for a subtle "film" flicker. Only active above intensity 15.
export function GrainOverlay({ intensity }: GrainOverlayProps) {
  const filterRef = useRef<SVGFETurbulenceElement | null>(null);
  const rafRef = useRef<number>(0);
  const seedRef = useRef(0);

  const shouldAnimate = intensity > 15;

  useEffect(() => {
    if (!shouldAnimate) return;
    let frame = 0;
    const tick = () => {
      frame++;
      if (frame % 3 === 0 && filterRef.current) {
        // Shift seed every 3 frames (~20fps) for subtle film flicker
        seedRef.current = (seedRef.current + 1) % 100;
        filterRef.current.setAttribute('seed', String(seedRef.current));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [shouldAnimate]);

  if (intensity <= 0) return null;

  const opacity = Math.min(intensity / 100, 1) * 0.85;

  return (
    <>
      {/* Inline SVG filter definition */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="pl-grain-filter" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              ref={filterRef}
              type="fractalNoise"
              baseFrequency="0.72"
              numOctaves="4"
              seed="2"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      {/* Grain overlay div */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9990,
          pointerEvents: 'none',
          opacity,
          mixBlendMode: 'overlay',
          filter: 'url(#pl-grain-filter)',
          willChange: 'opacity',
          // Tiled SVG rect as fallback if CSS filter isn't applied
          background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23g)'/%3E%3C/svg%3E\") repeat",
        }}
      />
    </>
  );
}
