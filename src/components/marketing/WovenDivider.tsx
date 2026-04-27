'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/WovenDivider.tsx
//
// A section divider that continues the hero's loom motif down
// the page — same threads, same shuttle motion, different
// altitude. Visually, the hero's weft threads keep travelling
// across this slim band so the page feels like a single
// unbroken woven surface rather than disconnected sections.
//
// Pure SVG + CSS (no shader) because this sits near the fold
// where perf matters and it needs to render instantly.
// ─────────────────────────────────────────────────────────────

interface WovenDividerProps {
  /** Height of the divider band in px. Default 96. */
  height?: number;
  /** Feathers the top edge into the preceding section. */
  feather?: boolean;
  /** Override the strand count (default 9, scales to vw). */
  strands?: number;
}

export function WovenDivider({
  height = 96,
  feather = true,
  strands = 9,
}: WovenDividerProps) {
  const threads = Array.from({ length: strands }, (_, i) => {
    const y = (i + 1) * (100 / (strands + 1));
    const edge = Math.abs(i - (strands - 1) / 2) / ((strands - 1) / 2);
    const opacity = 0.26 - edge * 0.18;
    const delay = -i * 0.9;
    const width = 0.24 + (1 - edge) * 0.18;
    return { y, opacity, delay, width };
  });

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: '100%',
        height,
        background: 'var(--pl-cream)',
        overflow: 'hidden',
      }}
    >
      {feather && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, color-mix(in oklab, var(--pl-cream-deep) 60%, transparent) 0%, transparent 38%, transparent 62%, color-mix(in oklab, var(--pl-cream) 90%, transparent) 100%)',
          }}
        />
      )}

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          {/* Same warp gradient as the hero threads — cohesion by
              reusing the exact Pearshell stops. */}
          <linearGradient id="pl-divider-warp" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="var(--pl-bruise)"   stopOpacity="0" />
            <stop offset="28%"  stopColor="var(--pl-bruise)"   stopOpacity="0.45" />
            <stop offset="62%"  stopColor="var(--pl-pearl-c)"  stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--pl-pearl-b)"  stopOpacity="0" />
          </linearGradient>
          <linearGradient id="pl-divider-warp-alt" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="var(--pl-olive)" stopOpacity="0" />
            <stop offset="35%"  stopColor="var(--pl-olive)" stopOpacity="0.38" />
            <stop offset="70%"  stopColor="var(--pl-gold)"  stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--pl-gold)"  stopOpacity="0" />
          </linearGradient>
        </defs>

        {threads.map((t, i) => (
          <line
            key={i}
            x1="-5"
            x2="105"
            y1={t.y}
            y2={t.y}
            stroke={`url(#${i % 2 === 0 ? 'pl-divider-warp' : 'pl-divider-warp-alt'})`}
            strokeWidth={t.width}
            strokeLinecap="round"
            strokeDasharray="0.08 0.04"
            opacity={t.opacity}
            vectorEffect="non-scaling-stroke"
            style={{
              animation: `pl-weave-travel 7.4s linear infinite`,
              animationDelay: `${t.delay}s`,
            }}
          />
        ))}

        {/* A single pearl bead drifts the other direction so the
            reader's eye is gently pulled back across the page as
            it descends. */}
        <circle r="0.6" fill="var(--pl-pearl-a)" opacity="0.9">
          <animateMotion
            dur="13s"
            repeatCount="indefinite"
            path="M 105 52 Q 70 48 50 54 T -5 50"
          />
        </circle>

        {/* Editorial hairline — the one perfectly straight rule
            that anchors the thread motion. */}
        <line
          x1="0"
          x2="100"
          y1="50"
          y2="50"
          stroke="var(--pl-divider)"
          strokeWidth="0.08"
          vectorEffect="non-scaling-stroke"
          opacity="0.6"
        />
      </svg>

      {/* Paused motion for reduced-motion users — threads hold
          their shuttled positions. */}
      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          svg line {
            animation: none !important;
          }
          svg circle {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
