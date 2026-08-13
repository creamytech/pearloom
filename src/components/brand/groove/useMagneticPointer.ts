'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/useMagneticPointer.ts
//
// Magnetic-pointer hover effect. The target element subtly
// pulls toward the cursor within a radius, then springs back
// on leave. The signature "Linear/Stripe/Vercel" micro-motion
// that makes CTAs feel alive.
//
// Usage:
//   const ref = useRef<HTMLButtonElement>(null);
//   useMagneticPointer(ref, { strength: 0.35 });
//
// Honours prefers-reduced-motion — becomes a no-op. Cleans up
// listeners + rAF on unmount. No framer-motion dep.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, type RefObject } from 'react';

interface MagneticOptions {
  /** How much the element follows the cursor (0–1). Default 0.3. */
  strength?: number;
  /** Radius (px) where magnetism activates. Default 120. */
  radius?: number;
  /** Max pixel offset in any direction. Default 20. */
  maxOffset?: number;
}

export function useMagneticPointer<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { strength = 0.3, radius = 120, maxOffset = 20 }: MagneticOptions = {},
) {
  const rafRef = useRef<number | null>(null);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;
    }

    const animate = () => {
      // Spring lerp toward target.
      currentX.current += (targetX.current - currentX.current) * 0.18;
      currentY.current += (targetY.current - currentY.current) * 0.18;
      if (el) {
        el.style.transform = `translate3d(${currentX.current.toFixed(2)}px, ${currentY.current.toFixed(2)}px, 0)`;
      }
      // Keep rAF running while there's motion; idle stops.
      const stillMoving =
        Math.abs(targetX.current - currentX.current) > 0.05 ||
        Math.abs(targetY.current - currentY.current) > 0.05;
      if (stillMoving) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
      }
    };

    const ensureRaf = () => {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        targetX.current = 0;
        targetY.current = 0;
      } else {
        // Scale down as the cursor leaves the center — smoother.
        const falloff = 1 - dist / radius;
        targetX.current = Math.max(-maxOffset, Math.min(maxOffset, dx * strength * falloff));
        targetY.current = Math.max(-maxOffset, Math.min(maxOffset, dy * strength * falloff));
      }
      ensureRaf();
    };

    const onPointerLeave = () => {
      targetX.current = 0;
      targetY.current = 0;
      ensureRaf();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    el.addEventListener('pointerleave', onPointerLeave);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerleave', onPointerLeave);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (el) el.style.transform = '';
    };
  }, [ref, strength, radius, maxOffset]);
}
