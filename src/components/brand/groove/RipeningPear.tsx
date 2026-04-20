'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/RipeningPear.tsx
//
// A single 3D pear that ripens green → butter → terra as the
// page scrolls. Breathes gently in idle. Signature hero visual
// for the groove product-UI brand — literal pear (fruit) +
// ambient motion, no gemstone aesthetic.
//
// Perf contract:
//   • R3F + three live in PearScene.tsx, loaded via
//     next/dynamic so the bundle isn't shipped on first paint
//     and the R3F JSX augmentation is scoped to that module.
//   • Entirely skipped when prefers-reduced-motion: reduce —
//     SVG fallback is the permanent view for those users.
//   • Feature-detects WebGL; SVG fallback if unavailable.
//   • Scroll-linked ripeness is read INTERNALLY via rAF on a
//     ref — no React re-renders on scroll. Parent components
//     don't need to subscribe to scroll and pass the prop,
//     which was the old jank source.
//
// `ripeness` prop still accepted (0–1) for manually driven
// cases (wizard demo, /brand/groove review page); when
// omitted, the component self-drives from scroll.
// ─────────────────────────────────────────────────────────────

import { Suspense, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const PearScene = dynamic(() => import('./PearScene'), { ssr: false });

interface RipeningPearProps {
  /** If set, overrides the internal scroll-driven ripeness. */
  ripeness?: number;
  /** Pixel size of the canvas (square). Default 360. */
  size?: number;
  className?: string;
  /** When true (default) the pear ripens as the page scrolls
   *  through the first viewport. Opt out for static demos. */
  scrollDriven?: boolean;
}

function PearSvgFallback({ ripeness = 0, size = 360 }: { ripeness?: number; size?: number }) {
  const r = Math.max(0, Math.min(1, ripeness));
  const bodyColor = r < 0.5
    ? `color-mix(in oklab, var(--pl-groove-pear-unripe) ${Math.round((1 - r * 2) * 100)}%, var(--pl-groove-pear-ripe))`
    : `color-mix(in oklab, var(--pl-groove-pear-ripe) ${Math.round((1 - (r - 0.5) * 2) * 100)}%, var(--pl-groove-pear-bruise))`;
  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={size}
      role="img"
      aria-label="Pearloom pear"
      style={{ display: 'block' }}
    >
      <path d="M110 38 Q128 22 142 28 Q138 46 118 48 Z" fill="var(--pl-groove-sage)" />
      <rect x="97" y="28" width="6" height="30" rx="3" fill="#5a4028" />
      <path
        d="M100 58 C 60 58 40 100 40 150 C 40 200 70 220 100 220 C 130 220 160 200 160 150 C 160 100 140 58 100 58 Z"
        fill={bodyColor}
        stroke="rgba(43,30,20,0.08)"
        strokeWidth="1"
      />
      <ellipse cx="78" cy="130" rx="18" ry="30" fill="rgba(255,255,255,0.3)" />
    </svg>
  );
}

export function RipeningPear({
  ripeness: ripenessProp,
  size = 360,
  className,
  scrollDriven = true,
}: RipeningPearProps) {
  const [canUseWebGL, setCanUseWebGL] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  // SVG fallback needs a state-driven ripeness because it's a
  // React-rendered colour. We update it once per rAF tick — NOT
  // once per scroll event — so the update frequency is capped
  // at the monitor refresh rate, and we only push state through
  // React when the value actually changes.
  const [svgRipeness, setSvgRipeness] = useState(ripenessProp ?? 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefersReducedMotion(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      setCanUseWebGL(!!gl);
    } catch {
      setCanUseWebGL(false);
    }

    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Internal scroll-driven ripeness (no parent setState). The
  // latest value lives on a ref; PearScene reads it imperatively
  // inside its rAF loop, so three.js sees updates without any
  // React render work.
  const ripenessRef = useRef(ripenessProp ?? 0);
  useEffect(() => {
    if (!scrollDriven || ripenessProp !== undefined) {
      ripenessRef.current = ripenessProp ?? 0;
      setSvgRipeness(ripenessProp ?? 0);
      return;
    }
    if (typeof window === 'undefined') return;
    let raf = 0;
    let lastPublished = -1;
    const tick = () => {
      const y = window.scrollY;
      const max = Math.max(1, window.innerHeight * 0.9);
      const r = Math.min(1, Math.max(0, y / max));
      ripenessRef.current = r;
      // Only push React state when the SVG fallback is visible
      // AND the value moved materially, so we don't re-render
      // unless there's something to show.
      if (prefersReducedMotion || !canUseWebGL) {
        const rounded = Math.round(r * 100) / 100;
        if (rounded !== lastPublished) {
          lastPublished = rounded;
          setSvgRipeness(rounded);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scrollDriven, ripenessProp, prefersReducedMotion, canUseWebGL]);

  const useStatic = !canUseWebGL || prefersReducedMotion;
  const currentRipeness = ripenessProp ?? svgRipeness;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {useStatic ? (
        <PearSvgFallback ripeness={currentRipeness} size={size} />
      ) : (
        <Suspense fallback={<PearSvgFallback ripeness={currentRipeness} size={size} />}>
          <PearScene ripenessRef={ripenessRef} />
        </Suspense>
      )}
    </div>
  );
}
