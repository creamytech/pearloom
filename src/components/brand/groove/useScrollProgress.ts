'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/useScrollProgress.ts
//
// Returns a 0–1 value representing how far an element has
// scrolled through the viewport. 0 = just entering from the
// bottom, 1 = just leaving from the top. Useful for any
// scroll-linked transform (parallax, fade, scale, etc.) that
// doesn't warrant the full framer-motion useScroll machinery.
//
// rAF-throttled, IntersectionObserver-gated so off-screen
// elements don't waste cycles.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type RefObject } from 'react';

export function useScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
): number {
  const [progress, setProgress] = useState(0);
  const visibleRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleRef.current = entry.isIntersecting;
          if (entry.isIntersecting) tick();
        }
      },
      { threshold: [0, 0.01, 0.25, 0.5, 0.75, 0.99, 1] },
    );
    io.observe(el);

    const tick = () => {
      if (!visibleRef.current || !el) {
        rafRef.current = null;
        return;
      }
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight;
      // 0 when the top of the element is just below the viewport;
      // 1 when the bottom of the element is just above the top.
      const travelled = viewportH - rect.top;
      const total = viewportH + rect.height;
      const p = Math.max(0, Math.min(1, travelled / total));
      setProgress(p);
      rafRef.current = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (rafRef.current === null && visibleRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    tick();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [ref]);

  return progress;
}
