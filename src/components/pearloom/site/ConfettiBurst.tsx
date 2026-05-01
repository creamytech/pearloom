'use client';

/* ========================================================================
   ConfettiBurst — fixed overlay that plays once when `active` flips to
   true. Pulls the burst PNG from manifest.decorLibrary.confetti and
   scales it from 0 → full with a short 1.4s animation, then removes
   itself from the DOM via AnimatePresence-style state so it never
   lingers.

   Honors prefers-reduced-motion by showing the burst statically for
   900ms with no scaling.
   ======================================================================== */

import { useEffect, useState } from 'react';

interface Props {
  /** When true, the burst plays once. Parent resets to false afterward. */
  active: boolean;
  url?: string;
  /** Optional fallback — if no AI confetti is set, renders CSS-only
   *  coloured triangles instead of skipping entirely. */
  fallback?: boolean;
}

export function ConfettiBurst({ active, url, fallback = true }: Props) {
  // Mount the inner only while active is true. The inner owns
  // its 1700ms self-hide timer locally, with `playing: true` as
  // the initial state — no setState-in-effect cascade. When the
  // parent flips active=false (or any time `active` re-flips to
  // true) the inner remounts, which restarts the timer.
  if (!active) return null;
  if (!url && !fallback) return null;
  return <ConfettiBurstInner url={url} fallback={fallback} />;
}

function ConfettiBurstInner({ url, fallback }: { url?: string; fallback: boolean }) {
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setPlaying(false), 1700);
    return () => clearTimeout(t);
  }, []);
  if (!playing) return null;
  if (!url && !fallback) return null;

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9000,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {url ? (
        <div
          style={{
            width: 'min(90vw, 900px)',
            aspectRatio: '1 / 1',
            backgroundImage: `url(${url})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            animation: reduced ? undefined : 'pl8-confetti-burst 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            opacity: reduced ? 0.82 : 0,
          }}
        />
      ) : (
        <CssConfetti reduced={reduced} />
      )}
      <style jsx>{`
        @keyframes pl8-confetti-burst {
          0%   { opacity: 0; transform: scale(0.6); }
          40%  { opacity: 1; transform: scale(1.08); }
          70%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}

function CssConfetti({ reduced }: { reduced?: boolean }) {
  // Editorial fallback: 36 paper shards + petals tossed in the
  // brand palette (peach, sage, lavender, gold, cream). Three
  // shape families — slim rectangle (paper strip), circle
  // (pearl), oblong oval (petal) — and per-piece horizontal drift
  // so the burst doesn't read as a sterile vertical curtain.
  // When reduced-motion is on, fade a soft peach halo in instead.
  const pieces = Array.from({ length: 36 });
  if (reduced) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--peach-ink) 24%, transparent) 0%, transparent 65%)',
          animation: 'pl8-confetti-static 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
          opacity: 0,
        }}
      >
        <style jsx>{`
          @keyframes pl8-confetti-static {
            0%   { opacity: 0; }
            30%  { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }
  // Five-colour palette spanning the brand's warm half.
  const PALETTE = [
    'var(--peach-ink, #C6703D)',
    'var(--sage-deep, #5C6B3F)',
    'var(--lavender-ink, #8B6F8E)',
    'var(--gold, #B8935A)',
    'var(--cream-deep, #EBE3D2)',
  ];
  // Three shape families — render-order interleaved so the burst
  // reads as varied paper, not stripes vs. circles in clusters.
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {pieces.map((_, i) => {
        const seed = (i + 1) * 31;
        const left = (seed * 7) % 100;
        const delay = ((i % 8) * 40) / 1000; // 0–280ms stagger
        const colour = PALETTE[i % PALETTE.length];
        const shape = i % 3; // 0 strip, 1 pearl, 2 petal
        const size = 7 + ((seed * 5) % 11);
        const drift = ((seed * 3) % 60) - 30; // -30 → +30 vw drift
        const rotate0 = (seed * 17) % 360;
        const rotateEnd = rotate0 + 540 + ((seed * 7) % 360);
        const dur = 1.7 + ((seed * 11) % 90) / 100; // 1.7–2.6s
        const styleByShape: React.CSSProperties =
          shape === 0
            ? {
                width: Math.max(4, size * 0.4),
                height: size * 1.6,
                background: colour,
                borderRadius: 2,
              }
            : shape === 1
              ? {
                  width: size,
                  height: size,
                  background: colour,
                  borderRadius: '50%',
                }
              : {
                  width: size * 0.7,
                  height: size * 1.3,
                  background: colour,
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                };
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: '-10%',
              opacity: 0.92,
              transform: `rotate(${rotate0}deg)`,
              animation: `pl8-confetti-fall ${dur}s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s forwards`,
              ['--pl-confetti-drift' as string]: `${drift}vw`,
              ['--pl-confetti-rot-end' as string]: `${rotateEnd}deg`,
              willChange: 'transform, opacity',
              ...styleByShape,
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes pl8-confetti-fall {
          0%   {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0;
          }
          12%  { opacity: 1; }
          100% {
            transform: translate(var(--pl-confetti-drift, 0), 95vh) rotate(var(--pl-confetti-rot-end, 540deg));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
