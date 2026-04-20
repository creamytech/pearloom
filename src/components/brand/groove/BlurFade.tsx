'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/BlurFade.tsx
//
// Scroll/mount reveal wrapper — blurs + translates from a soft
// starting state to sharp. The groove universal entrance.
//
// Pattern from Magic UI "Blur Fade", rebuilt on groove springs
// (--pl-groove-ease-bloom) with framer-motion (already in deps).
// ─────────────────────────────────────────────────────────────

import { motion, useInView } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

interface BlurFadeProps {
  children: ReactNode;
  /** Delay in seconds before animating in. */
  delay?: number;
  /** Translation distance (px). Default 14. */
  distance?: number;
  /** Initial blur in px. Default 8. */
  blur?: number;
  /** Direction of travel. */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Entrance duration. */
  duration?: number;
  /** Fire only once, don't retrigger on re-enter. */
  once?: boolean;
  className?: string;
}

export function BlurFade({
  children,
  delay = 0,
  distance = 14,
  blur = 8,
  direction = 'up',
  duration = 0.7,
  once = true,
  className,
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-80px 0px -60px 0px' });

  const offsetMap: Record<string, { x?: number; y?: number }> = {
    up:    { y: distance },
    down:  { y: -distance },
    left:  { x: distance },
    right: { x: -distance },
    none:  {},
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, filter: `blur(${blur}px)`, ...offsetMap[direction] }}
      animate={
        inView
          ? { opacity: 1, filter: 'blur(0px)', x: 0, y: 0 }
          : { opacity: 0, filter: `blur(${blur}px)`, ...offsetMap[direction] }
      }
      transition={{
        delay,
        duration,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
