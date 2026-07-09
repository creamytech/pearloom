'use client';

// ─────────────────────────────────────────────────────────────
// LazyStickyRsvpPill — scroll-gated loader for StickyRsvpPill.
//
// The pill (framer-motion + lucide) never shows until the guest has
// scrolled ~30% of the page, so there's no reason to ship its code
// on first paint. This wrapper waits for the first scroll signal —
// or a page that ARRIVES scrolled (anchor deep-links, restored
// positions) — and only then imports the real pill, whose own
// show/dismiss/occlusion logic takes over untouched (its scroll
// handler runs once on mount, so state is correct even if the guest
// kept scrolling while the chunk loaded).
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const StickyRsvpPill = dynamic(
  () => import('@/components/site/StickyRsvpPill').then((m) => m.StickyRsvpPill),
  { ssr: false },
);

interface Props {
  accent?: string;
  accentInk?: string;
  rsvpLabel?: string;
  anchorId?: string;
}

export function LazyStickyRsvpPill(props: Props) {
  const [load, setLoad] = useState(false);

  useEffect(() => {
    if (load) return;
    const arm = () => setLoad(true);
    /* Arrived-scrolled check via rAF, not a direct effect set (the
       compiler's setState-in-effect rule + it defers off the
       hydration frame). */
    const id = requestAnimationFrame(() => {
      if (window.scrollY > 0) arm();
    });
    window.addEventListener('scroll', arm, { passive: true, once: true });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('scroll', arm);
    };
  }, [load]);

  if (!load) return null;
  return <StickyRsvpPill {...props} />;
}
