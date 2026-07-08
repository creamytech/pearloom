'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/ThreadingDoor.tsx
//
// The threshold between signing in and the loom — a full-screen
// editorial-midnight scene: two foil threads draw across the dark,
// the mark inks itself in, and a letterpress line names the moment.
// BRAND §7: never "Loading…" — this is "Threading you in."
//
// Mounted by the sign-in page the instant a session exists (both
// the fresh credentials path and the returning-visitor bounce) and
// held over the route swap, so the journey reads letter → thread →
// loom instead of form → flash → dashboard. Deliberately NOT a
// route-level loading.tsx: (shell)/loading.tsx is null on purpose
// (no tab-switch flashes), and this scene belongs to the arrival
// moment only.
//
// prefers-reduced-motion: the strands and press-in resolve to
// their settled frames (animation.css guard); WeaveLoader falls
// back to its quiet gold pulse on its own.
// ─────────────────────────────────────────────────────────────

import { useId } from 'react';
import { FoilGradient } from '@/components/brand/pressed';
import { PearloomMark } from '@/components/brand/PearloomMark';
import { WeaveLoader } from '@/components/brand/WeaveLoader';

export function ThreadingDoor({
  label = 'Threading you in.',
}: {
  label?: string;
}) {
  const uid = useId().replace(/[«»:]/g, '');
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'grid',
        placeItems: 'center',
        background: '#14110C',
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.016) 0 1px, transparent 1px 3px)',
        animation: 'pl-fade-up-late 0.28s ease both',
        overflow: 'hidden',
      }}
    >
      {/* The strands — two foil threads drawing across the whole
          dark, crossing behind the type. */}
      <svg
        aria-hidden
        width="100%"
        height="120"
        viewBox="0 0 1600 120"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)' }}
      >
        <FoilGradient id={`td-foil-${uid}`} />
        <path
          className="pl-thread-draw"
          d="M0 52 C 400 38, 800 66, 1600 50"
          fill="none"
          stroke={`url(#td-foil-${uid})`}
          strokeWidth="1.1"
          opacity="0.5"
          style={{ ['--pl-draw-len' as string]: 1700, ['--pl-draw-dur' as string]: '1.6s', ['--pl-draw-delay' as string]: '0.1s' } as React.CSSProperties}
        />
        <path
          className="pl-thread-draw"
          d="M0 66 C 420 82, 820 40, 1600 68"
          fill="none"
          stroke="rgba(139,156,90,0.55)"
          strokeWidth="1.1"
          style={{ ['--pl-draw-len' as string]: 1700, ['--pl-draw-dur' as string]: '1.6s', ['--pl-draw-delay' as string]: '0.28s' } as React.CSSProperties}
        />
      </svg>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: 24, textAlign: 'center' }}>
        <PearloomMark size={46} animated color="#E8DEC4" />
        <div
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'rgba(232,222,196,0.55)',
          }}
        >
          One moment
        </div>
        <div
          className="pl-fade-late"
          style={{
            fontFamily: 'var(--pl-font-display, serif)',
            fontStyle: 'italic',
            fontWeight: 420,
            fontSize: 'clamp(28px, 4.5vw, 40px)',
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            color: '#F1EAD8',
            fontVariationSettings: "'opsz' 144, 'SOFT' 70, 'WONK' 1",
            /* Letterpress on midnight — a whisper of dark below,
               light above, so the glyphs sit into the ground. */
            textShadow: '0 1px 1px rgba(0,0,0,0.55), 0 -1px 1px rgba(255,255,255,0.06)',
            ['--pl-fade-delay' as string]: '0.35s',
          } as React.CSSProperties}
        >
          {label}
        </div>
        <div className="pl-fade-late" style={{ marginTop: 6, ['--pl-fade-delay' as string]: '0.6s' } as React.CSSProperties}>
          <WeaveLoader size="sm" color="rgba(139,156,90,0.9)" color2="#C9A24B" ariaLabel="Threading" />
        </div>
      </div>
    </div>
  );
}
