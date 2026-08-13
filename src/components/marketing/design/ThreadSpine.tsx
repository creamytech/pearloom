'use client';

/* ─── ThreadSpine — the loom weaves the page ─────────────────────
   RADICAL-DESIGN-DIRECTIONS §C: one two-strand thread (olive +
   foil gold) enters at the top of the landing and GROWS down a
   fixed left rail as the visitor scrolls — the page reads as one
   woven object, tied off at the end. The leading tip carries a
   pearl.

   Implementation notes:
   - Fixed viewport rail; scroll progress (0→1 over the document)
     maps to stroke draw. rAF-throttled native-scroll listener (the
     landing scrolls natively — no Lenis).
   - Desktop-only (hidden under 1080px: phone gutters are too tight
     for a rail and the landing's rhythm carries itself there).
   - aria-hidden, pointer-events none — pure atmosphere.
   - prefers-reduced-motion: the thread renders fully woven, static.
   ────────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import { FoilGradient } from '@/components/brand/pressed';
import { usePrefersReducedMotion } from '@/components/pearloom/redesign/graceful-image';

const PATH_LEN = 1000; // normalized via pathLength

/* A slow two-strand weave down the viewport: crossings every ~18vh. */
const STRAND_A = 'M 12 -4 C 4 60, 20 120, 12 180 S 4 300, 12 360 S 20 480, 12 540 S 4 660, 12 720 S 20 840, 12 900 L 12 1004';
const STRAND_B = 'M 12 -4 C 20 60, 4 120, 12 180 S 20 300, 12 360 S 4 480, 12 540 S 20 660, 12 720 S 4 840, 12 900 L 12 1004';

export function ThreadSpine() {
  const reduced = usePrefersReducedMotion();
  const aRef = useRef<SVGPathElement>(null);
  const bRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const knotRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      /* The thread leads the reader slightly — at 0 it has already
         entered (12%), and it ties off just before the very end. */
      const drawn = 0.12 + p * 0.88;
      const offset = PATH_LEN * (1 - drawn);
      if (aRef.current) aRef.current.style.strokeDashoffset = String(offset);
      if (bRef.current) bRef.current.style.strokeDashoffset = String(offset + 30);
      if (tipRef.current) {
        const y = -4 + 1008 * drawn;
        tipRef.current.setAttribute('cy', String(Math.min(1000, y)));
        tipRef.current.style.opacity = p > 0.96 ? '0' : '1';
      }
      if (knotRef.current) {
        // The tie-off: at the page's end the strand KNOTS — the tip
        // pearl retires and a ringed knot takes its place.
        knotRef.current.style.opacity = p > 0.96 ? '1' : '0';
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div
      aria-hidden
      className="pd-thread-spine"
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 'clamp(10px, 2vw, 34px)',
        width: 24,
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <svg
        width="24"
        height="100%"
        viewBox="0 0 24 1000"
        preserveAspectRatio="none"
        style={{ display: 'block', height: '100%' }}
      >
        <defs>
          <FoilGradient id="pd-spine-foil" />
        </defs>
        <path
          ref={aRef}
          d={STRAND_A}
          fill="none"
          stroke="var(--pd-olive, #5C6B3F)"
          strokeWidth="1.4"
          strokeLinecap="round"
          pathLength={PATH_LEN}
          opacity={0.55}
          style={{ strokeDasharray: PATH_LEN, strokeDashoffset: reduced ? 0 : PATH_LEN * 0.88 }}
        />
        <path
          ref={bRef}
          d={STRAND_B}
          fill="none"
          stroke="url(#pd-spine-foil)"
          strokeWidth="1.4"
          strokeLinecap="round"
          pathLength={PATH_LEN}
          opacity={0.65}
          style={{ strokeDasharray: PATH_LEN, strokeDashoffset: reduced ? 0 : PATH_LEN * 0.88 + 30 }}
        />
        {/* The leading pearl — rides the tip of the weave. */}
        {!reduced && <circle ref={tipRef} cx="12" cy="116" r="2.4" fill="var(--pd-gold, #C19A4B)" />}
        {/* The tie-off knot — appears when the strand reaches the
            page's end (reduced motion shows it always: the thread is
            fully woven). */}
        <g ref={knotRef} style={{ opacity: reduced ? 1 : 0, transition: 'opacity 500ms ease' }}>
          <circle cx="12" cy="988" r="5.5" fill="none" stroke="var(--pd-gold, #C19A4B)" strokeWidth="1" opacity="0.7" />
          <circle cx="12" cy="988" r="2.8" fill="var(--pd-gold, #C19A4B)" />
        </g>
      </svg>
      <style>{`
        @media (max-width: 1079px) { .pd-thread-spine { display: none; } }
      `}</style>
    </div>
  );
}
