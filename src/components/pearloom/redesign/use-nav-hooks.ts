'use client';
 

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Returns true when the viewport width is at or below `breakpoint` pixels.
 * SSR-safe: returns false on the server / first render, then updates on
 * change. Implemented as an external-store subscription (matchMedia IS
 * the external system) so there's no setState-in-effect cascade.
 */
export function useIsMobile(breakpoint: number = 760): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return () => {};
    }
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Legacy fallback for older Safari.
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [breakpoint]);
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  }, [breakpoint]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Observes the given section ids and returns the id of the one currently
 * most-in-view (highest intersectionRatio amongst intersecting entries).
 *
 * Uses a single IntersectionObserver with rootMargin '-30% 0px -60% 0px'
 * so the active id flips as a section crosses the upper third of the
 * viewport. SSR-safe; returns null on the server / first render.
 */
export function useActiveSection(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const idsKey = JSON.stringify(sectionIds);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    if (!sectionIds || sectionIds.length === 0) {
      return;
    }

    // Track the latest intersection ratio per observed id so we can pick
    // the best candidate across multiple observer callbacks.
    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (!id) continue;
          ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        let bestId: string | null = null;
        let bestRatio = 0;
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (bestRatio > 0) {
          setActiveId(bestId);
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    const observed: Element[] = [];
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        observed.push(el);
        ratios.set(id, 0);
      }
    }

    return () => {
      for (const el of observed) {
        observer.unobserve(el);
      }
      observer.disconnect();
      ratios.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return activeId;
}
