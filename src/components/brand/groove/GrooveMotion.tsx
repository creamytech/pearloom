'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/GrooveMotion.tsx
//
// Global motion provider. Initialises Lenis for silky
// momentum scroll on marketing + dashboard surfaces, honours
// prefers-reduced-motion (Lenis disabled → native scroll).
//
// Opt-in per route: wrap a layout or page in <GrooveMotion>
// to enable. Published sites and the editor preview canvas
// should NOT be wrapped — they use native scroll so embeds
// (iframes, scroll-snap shelves, drag-drop) behave normally.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, type ReactNode } from 'react';

interface GrooveMotionProps {
  children: ReactNode;
  /** Momentum feel — higher = longer coast. Default 1.2. */
  lerp?: number;
  /** Wheel multiplier — higher = more scroll per tick. */
  wheelMultiplier?: number;
  /** Disable smoothing entirely (e.g. for routes with lots of
      native scroll-snap / drag behaviour). */
  disabled?: boolean;
}

export function GrooveMotion({
  children,
  lerp = 0.08,
  wheelMultiplier = 1,
  disabled = false,
}: GrooveMotionProps) {
  const lenisRef = useRef<unknown>(null);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === 'undefined') return;

    // Honour reduced-motion preference — skip Lenis entirely.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let rafId = 0;
    let cancelled = false;

    (async () => {
      try {
        const LenisMod = await import('lenis');
        if (cancelled) return;
        const Lenis = LenisMod.default;
        const lenis = new Lenis({
          lerp,
          wheelMultiplier,
          smoothWheel: true,
          // Default to natural touch scroll — momentum on
          // touch devices is handled by the OS already and
          // fighting it feels wrong.
          syncTouch: false,
        });
        lenisRef.current = lenis;

        const raf = (time: number) => {
          lenis.raf(time);
          rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);
      } catch {
        // Lenis failed to load — native scroll is a fine fallback.
      }
    })();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      const l = lenisRef.current as { destroy?: () => void } | null;
      l?.destroy?.();
      lenisRef.current = null;
    };
  }, [disabled, lerp, wheelMultiplier]);

  return <>{children}</>;
}
