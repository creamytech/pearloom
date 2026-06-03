'use client';
/* eslint-disable no-restricted-syntax */

import { useEffect, useState } from 'react';

/**
 * Returns true when the viewport width is at or below `breakpoint` pixels.
 * SSR-safe: returns false on the server / first render, then updates on mount.
 */
export function useIsMobile(breakpoint: number = 760): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);

    const handler = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }

    // Legacy fallback for older Safari.
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, [breakpoint]);

  return isMobile;
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
