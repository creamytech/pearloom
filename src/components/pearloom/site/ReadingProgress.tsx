'use client';

// ─────────────────────────────────────────────────────────────
// ReadingProgress — peach-to-gold hairline at the top of the
// canvas that fills L → R as the host scrolls. Sits at z-60 so
// it stays above section content but below the nav. Tracks the
// global document scroll so it works on both the published site
// and the editor canvas (the editor doesn't put canvas in an
// iframe; everything's the same scroll context).
//
// rAF-throttled so we don't fire setState 60+ times per scroll
// event.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf: number | null = null;
    function compute() {
      raf = null;
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const ratio = Math.max(0, Math.min(1, doc.scrollTop / total));
      setProgress(ratio);
    }
    function onScroll() {
      if (raf != null) return;
      raf = window.requestAnimationFrame(compute);
    }
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf != null) window.cancelAnimationFrame(raf);
    };
  }, []);

  // Hide entirely until the host has scrolled at least 4% — the
  // hairline at 0 looks like a stray 1px line on the top of the
  // page and is the only obviously "tracking" UI on a fresh load.
  if (progress < 0.04) return null;

  return (
    <div
      className="pl8-reading-progress"
      aria-hidden
      style={{ ['--pl-progress' as string]: `${(progress * 100).toFixed(1)}%` }}
    />
  );
}
