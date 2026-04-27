'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/AmbientNav.tsx
//
// A navigation wrapper that hides on scroll-down and returns
// on scroll-up (and any pointer intent near the top edge).
// Lets the page's content breathe and returns chrome only
// when the user signals they want it.
//
// Wraps any nav / header — works with the existing
// MarketingNav, SiteNav, and dashboard headers.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface AmbientNavProps {
  children: ReactNode;
  /** CSS offset from top when pinned. */
  offset?: number;
  /** Threshold in px before hide behaviour activates. */
  activateAfter?: number;
  /** Force visible (e.g. on a mobile menu open). */
  forceVisible?: boolean;
  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
}

export function AmbientNav({
  children,
  offset = 0,
  activateAfter = 120,
  forceVisible = false,
  className,
  style,
  zIndex = 40,
}: AmbientNavProps) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const lastYRef = useRef(0);
  const intentRef = useRef(0);

  useEffect(() => {
    if (reduced) return;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastYRef.current;

      if (y < activateAfter) {
        setVisible(true);
        lastYRef.current = y;
        return;
      }

      // Tiny accumulator so we don't flicker on trackpad inertia.
      intentRef.current += delta;
      if (Math.abs(intentRef.current) > 18) {
        setVisible(intentRef.current < 0);
        intentRef.current = 0;
      }
      lastYRef.current = y;
    };

    const onPointer = (e: PointerEvent) => {
      // Pointer near the top edge reveals the nav regardless of scroll state.
      if (e.clientY < 64) setVisible(true);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [activateAfter, reduced]);

  const shown = forceVisible || visible || reduced;

  return (
    <motion.div
      className={className}
      initial={false}
      animate={{
        y: shown ? 0 : -96,
        opacity: shown ? 1 : 0,
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 36 }}
      style={{
        position: 'fixed',
        top: offset,
        left: 0,
        right: 0,
        zIndex,
        pointerEvents: shown ? 'auto' : 'none',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
