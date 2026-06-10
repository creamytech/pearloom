'use client';

/* ════════════════════════════════════════════════════════════════
   WOVEN DIVIDER — the loom passing through the page.

   A full-width band where two hairline strands (olive + gold)
   cross each other in a slow weave, with a gold glint traveling
   the warp — the same motion vocabulary as the editor's thread
   FX and the brand mark. Sits between the hero and the three
   acts so the scroll reads as one continuous thread of story.
   Static (no glint) under reduced motion.
   ════════════════════════════════════════════════════════════════ */

import { PD } from './DesignAtoms';

export function WovenDivider() {
  return (
    <div aria-hidden style={{ overflow: 'hidden', lineHeight: 0, padding: '8px 0' }}>
      <svg
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        style={{ width: '100%', height: 64, display: 'block' }}
      >
        {/* warp — olive strand */}
        <path
          d="M -20 36 C 160 16, 320 52, 480 34 C 640 16, 800 50, 960 32 C 1120 16, 1280 48, 1460 30"
          fill="none"
          stroke={PD.olive}
          strokeWidth="1.4"
          opacity="0.5"
        />
        {/* weft — gold strand crossing it */}
        <path
          d="M -20 28 C 160 48, 320 14, 480 32 C 640 50, 800 16, 960 34 C 1120 50, 1280 18, 1460 36"
          fill="none"
          stroke={PD.gold}
          strokeWidth="1.2"
          opacity="0.7"
        />
        {/* traveling glint on the gold strand */}
        <path
          className="pd-weave-glint"
          d="M -20 28 C 160 48, 320 14, 480 32 C 640 50, 800 16, 960 34 C 1120 50, 1280 18, 1460 36"
          fill="none"
          stroke={PD.gold}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="46 1800"
        />
        {/* pearls where the strands cross */}
        {[480, 960].map((x, i) => (
          <circle key={x} cx={x} cy={33} r={3.4} fill={PD.gold} stroke={PD.paper} strokeWidth={1.6} opacity={i === 0 ? 0.9 : 0.7} />
        ))}
      </svg>
      <style jsx>{`
        .pd-weave-glint {
          animation: pd-weave-glint 9s linear infinite;
        }
        @keyframes pd-weave-glint {
          from { stroke-dashoffset: 1846; }
          to   { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pd-weave-glint { animation: none; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
