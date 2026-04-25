'use client';

/* ========================================================================
   useHeroParallax — gentle cursor-tracked parallax for the hero section.

   Returns a ref + style object. Drop the ref on the hero <section> and
   spread the style on the decorative layer you want to drift. The
   parallax follows the cursor with a small max offset (8px) so it
   feels like the paper is being lit from the user's pointer rather
   than the surface tilting like an iPad.

   Honours `prefers-reduced-motion`.
   ======================================================================== */

import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface Result {
  ref: React.MutableRefObject<HTMLElement | null>;
  style: CSSProperties;
}

export function useHeroParallax(maxOffset: number = 10): Result {
  const ref = useRef<HTMLElement | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let raf = 0;
    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };

    function onMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      target = {
        x: Math.max(-1, Math.min(1, dx)) * maxOffset,
        y: Math.max(-1, Math.min(1, dy)) * maxOffset,
      };
    }

    function tick() {
      // ease toward target — natural follow-through
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      setOffset({ x: Math.round(current.x * 10) / 10, y: Math.round(current.y * 10) / 10 });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    el.addEventListener('mousemove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      el?.removeEventListener('mousemove', onMove);
    };
  }, [maxOffset]);

  const style: CSSProperties = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    transition: 'transform 0ms linear',
    willChange: 'transform',
  };
  return { ref, style };
}
