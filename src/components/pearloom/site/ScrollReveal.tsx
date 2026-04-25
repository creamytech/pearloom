'use client';

/* ========================================================================
   ScrollReveal — sets data-pl-reveal="shown" on every section as it
   enters the viewport, triggering the fade-rise + filigree stroke
   draw-on animations defined in pearloom.css.

   Honours prefers-reduced-motion (sets shown immediately).
   Fires once per element and disconnects from the IntersectionObserver
   after triggering, so reveals don't replay on scroll-up.

   Drop once at the top of the published-site tree.
   ======================================================================== */

import { useEffect } from 'react';

export function ScrollReveal({ rootSelector = '.pl8-guest' }: { rootSelector?: string } = {}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const root = document.querySelector(rootSelector);
    const targets: HTMLElement[] = [];
    // Mark every <section> + every [data-pl-stroke-draw] as pending so
    // they start hidden (CSS rule applies when data-pl-reveal="pending").
    if (root) {
      root.querySelectorAll<HTMLElement>('section').forEach((s) => {
        // Skip the hero — it's already visible on load.
        if (s.id !== 'top') {
          s.setAttribute('data-pl-reveal', reduced ? 'shown' : 'pending');
          targets.push(s);
        }
      });
      root.querySelectorAll<HTMLElement>('[data-pl-stroke-draw]').forEach((el) => {
        el.setAttribute('data-pl-reveal', reduced ? 'shown' : 'pending');
        targets.push(el);
      });
    }
    if (reduced || targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).setAttribute('data-pl-reveal', 'shown');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [rootSelector]);
  return null;
}
