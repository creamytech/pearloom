'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/Wave.tsx
//
// Organic section divider — replaces the 1px hairline that the
// editorial brand uses for segmenting marketing sections. SVG
// path so it scales crisply to any width, no bundle overhead.
//
// Three depth variants (shallow / medium / deep) map to three
// different curve profiles. Flip the wave by passing `flipped`
// when the next section sits above the current one.
// ─────────────────────────────────────────────────────────────

type WaveDepth = 'shallow' | 'medium' | 'deep';

interface WaveProps {
  /** Fill colour — usually the next section's background. */
  color?: string;
  /** How curvy. Shallow = subtle, deep = dramatic. */
  depth?: WaveDepth;
  /** Flip vertically for bottom-of-section dividers. */
  flipped?: boolean;
  /** Pixel height — the wave's max amplitude. */
  height?: number;
}

// Each path uses a smooth cubic Bézier that fills the bottom
// half of the viewBox. Parameters tuned for 1200x120 viewBox.
const PATHS: Record<WaveDepth, string> = {
  shallow:
    'M0,48 C240,24 480,72 720,48 C960,24 1200,72 1200,48 L1200,120 L0,120 Z',
  medium:
    'M0,60 C200,10 500,110 720,60 C940,10 1240,110 1200,60 L1200,120 L0,120 Z',
  deep:
    'M0,80 C180,-10 520,140 720,70 C920,0 1260,140 1200,80 L1200,120 L0,120 Z',
};

export function Wave({
  color = 'var(--pl-groove-cream)',
  depth = 'medium',
  flipped = false,
  height = 80,
}: WaveProps) {
  return (
    <svg
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden="true"
      style={{
        display: 'block',
        width: '100%',
        height,
        transform: flipped ? 'scaleY(-1)' : undefined,
      }}
    >
      <path d={PATHS[depth]} fill={color} />
    </svg>
  );
}
