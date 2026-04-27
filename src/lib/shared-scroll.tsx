'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / lib/shared-scroll.tsx
// Shared scroll context — single scroll listener shared across
// all components that need scroll position (hero parallax,
// site nav progress bar, timeline items, etc.)
//
// Instead of each component creating its own useScroll() hook
// (which adds a separate scroll listener), they read from this
// shared context. One listener, many consumers.
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface SharedScrollValue {
  /** Normalized scroll position 0–1 (top to bottom of page) */
  progress: number;
  /** Raw scrollY in pixels */
  scrollY: number;
  /** Total scrollable height */
  scrollHeight: number;
  /** Viewport height */
  viewportHeight: number;
  /** Scroll direction: 1 = down, -1 = up, 0 = idle */
  direction: number;
}

const defaultValue: SharedScrollValue = {
  progress: 0,
  scrollY: 0,
  scrollHeight: 0,
  viewportHeight: 0,
  direction: 0,
};

const SharedScrollContext = createContext<SharedScrollValue>(defaultValue);

/**
 * Provider that creates a single scroll listener for the page.
 * Mount this once near the root (e.g., in layout or site page).
 */
export function SharedScrollProvider({ children }: { children: ReactNode }) {
  const [scroll, setScroll] = useState<SharedScrollValue>(defaultValue);
  const prevY = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      const total = document.documentElement.scrollHeight;
      const vh = window.innerHeight;
      const maxScroll = total - vh;

      setScroll({
        progress: maxScroll > 0 ? y / maxScroll : 0,
        scrollY: y,
        scrollHeight: total,
        viewportHeight: vh,
        direction: y > prevY.current ? 1 : y < prevY.current ? -1 : 0,
      });
      prevY.current = y;
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    // Initial measurement
    update();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <SharedScrollContext.Provider value={scroll}>
      {children}
    </SharedScrollContext.Provider>
  );
}

/**
 * Read the shared scroll state. Must be inside SharedScrollProvider.
 * Returns the same values as useScroll() but without creating a new listener.
 */
export function useSharedScroll(): SharedScrollValue {
  return useContext(SharedScrollContext);
}
