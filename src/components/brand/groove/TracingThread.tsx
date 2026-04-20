'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/TracingThread.tsx
//
// Scroll-linked SVG thread that draws itself alongside marketing
// content as the user scrolls. Literal loom-weft traveling down
// the page — ties the whole marketing story together visually.
//
// Adapted from Aceternity UI's Tracing Beam pattern, rebuilt
// with framer-motion's useScroll/useTransform on groove palette.
// Fixed-position so it persists through multiple sections.
// ─────────────────────────────────────────────────────────────

import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface TracingThreadProps {
  /** Side of the page — 'left' sits 28px from the edge, 'right' 28px in. */
  side?: 'left' | 'right';
  /** Hex or CSS var for the primary strand. */
  warp?: string;
  /** Hex or CSS var for the secondary strand. */
  weft?: string;
  /** Vertical pixel offset to start the thread below the nav. */
  top?: number;
  /** Hide on screens narrower than this px. Default 920. */
  hideBelow?: number;
}

export function TracingThread({
  side = 'left',
  warp = 'var(--pl-groove-terra)',
  weft = 'var(--pl-groove-butter)',
  top = 96,
  hideBelow = 920,
}: TracingThreadProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [show, setShow] = useState(false);

  // Measure document height so the thread spans the scroll.
  useEffect(() => {
    const measure = () => {
      const h = document.documentElement.scrollHeight - top - 120;
      setHeight(Math.max(600, h));
      setShow(window.innerWidth >= hideBelow);
    };
    measure();
    window.addEventListener('resize', measure);
    // Remeasure after images/fonts settle.
    const t = window.setTimeout(measure, 400);
    return () => {
      window.removeEventListener('resize', measure);
      window.clearTimeout(t);
    };
  }, [hideBelow, top]);

  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 40 });
  const dashOffset = useTransform(smooth, [0, 1], [height, 0]);
  const dotY = useTransform(smooth, [0, 1], [0, height]);

  if (!show || height === 0) return null;

  // The path is a gentle sine wave across ~24px so the thread
  // literally weaves, not a straight line.
  const pathWidth = 28;
  const path = (() => {
    const segments = Math.floor(height / 140);
    let d = `M 14 0`;
    for (let i = 0; i < segments; i++) {
      const y = 140 * (i + 1);
      const cpY = y - 70;
      const cx = i % 2 === 0 ? pathWidth - 2 : 2;
      d += ` Q ${cx} ${cpY}, 14 ${y}`;
    }
    return d;
  })();

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed',
        [side]: 28,
        top,
        width: pathWidth,
        height,
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      <svg
        width={pathWidth}
        height={height}
        viewBox={`0 0 ${pathWidth} ${height}`}
        fill="none"
        style={{ display: 'block' }}
      >
        {/* Static ghost path — low opacity warp strand */}
        <path
          d={path}
          stroke={warp}
          strokeOpacity="0.14"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Drawn-by-scroll weft strand */}
        <motion.path
          d={path}
          stroke={weft}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          style={{
            strokeDasharray: height,
            strokeDashoffset: dashOffset,
            filter: `drop-shadow(0 0 8px color-mix(in oklab, ${weft} 40%, transparent))`,
          }}
        />
      </svg>
      {/* Moving dot at the leading edge of the weft */}
      <motion.div
        style={{
          position: 'absolute',
          left: 8,
          top: 0,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: warp,
          boxShadow: `0 0 16px ${weft}, 0 0 28px color-mix(in oklab, ${weft} 50%, transparent)`,
          y: dotY,
        }}
      />
    </div>
  );
}
