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
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!active) return;
    setPlaying(true);
    const t = setTimeout(() => setPlaying(false), 1700);
    return () => clearTimeout(t);
  }, [active]);

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
  // Cheap fallback: 28 coloured triangles tossed around with CSS
  // keyframes. Used when no AI confetti URL exists — still feels alive.
  // When reduced-motion is on, fade a static halo in instead of animating.
  const pieces = Array.from({ length: 28 });
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
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {pieces.map((_, i) => {
        const seed = (i + 1) * 31;
        const left = (seed * 7) % 100;
        const delay = (i % 6) * 0.05;
        const hue = i % 3 === 0 ? 'var(--peach-ink)' : i % 3 === 1 ? 'var(--sage-deep)' : 'var(--lavender-ink)';
        const size = 8 + ((seed * 3) % 10);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: '-8%',
              width: size,
              height: size * 1.4,
              background: hue,
              opacity: 0.9,
              borderRadius: 2,
              transform: `rotate(${(seed * 17) % 360}deg)`,
              animation: `pl8-confetti-fall 1.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s forwards`,
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes pl8-confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translateY(90vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
