'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / effects/VignetteOverlay.tsx
// Radial gradient vignette that darkens page edges.
// intensity: 0 (off) → 100 (dramatic cinema black edges)
// ─────────────────────────────────────────────────────────────

interface VignetteOverlayProps {
  intensity: number; // 0–100
}

export function VignetteOverlay({ intensity }: VignetteOverlayProps) {
  if (intensity <= 0) return null;

  // Map 0–100 → alpha 0–0.85
  const alpha = (intensity / 100) * 0.85;
  // Expand the dark zone from center outward with intensity
  const spread = 30 + intensity * 0.4; // 30% → 70% coverage

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9989,
        pointerEvents: 'none',
        background: `radial-gradient(
          ellipse ${spread}% ${spread}% at 50% 50%,
          transparent 0%,
          rgba(0,0,0,${(alpha * 0.1).toFixed(3)}) 40%,
          rgba(0,0,0,${(alpha * 0.55).toFixed(3)}) 70%,
          rgba(0,0,0,${alpha.toFixed(3)}) 100%
        )`,
      }}
    />
  );
}
