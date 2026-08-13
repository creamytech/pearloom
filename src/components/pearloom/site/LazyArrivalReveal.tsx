'use client';

// ─────────────────────────────────────────────────────────────
// LazyArrivalReveal — deferred loader for the Sealed Arrival.
//
// ArrivalReveal carries framer-motion; loading it for every guest
// visit means every guest pays for the envelope even when it will
// never show (repeat visits, reduced motion, automation, `off`).
// This wrapper runs the same cheap "will it show at all?" early-outs
// ArrivalReveal itself runs, and only imports the real component
// when one of the arrival modes (envelope / quiet / return
// flourish) is actually going to mount.
//
// The decision details (seen-key WRITE, flourish-key write, mode
// choreography) stay inside ArrivalReveal — this wrapper only READS
// the same keys, so the two can't disagree about state, only about
// whether the code is worth fetching. Keep the literals in sync
// with ArrivalReveal's seenKey/flourishKey.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { StoryManifest } from '@/types';
import { getEventType } from '@/lib/event-os/event-types';

const ArrivalReveal = dynamic(
  () => import('./ArrivalReveal').then((m) => m.ArrivalReveal),
  { ssr: false },
);

interface Props {
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  theme: Record<string, string>;
  rsvpLabel: string;
}

/* Mirrors ArrivalReveal's resolveArrivalStyle — duplicated here (six
   lines) instead of imported so the wrapper doesn't statically pull
   the whole framer-motion module it exists to defer. */
function resolveStyle(manifest: StoryManifest): 'envelope' | 'quiet' | 'off' {
  const loose = manifest as unknown as { arrival?: string; occasion?: string };
  const pick = loose.arrival ?? 'auto';
  if (pick === 'envelope' || pick === 'quiet' || pick === 'off') return pick;
  const occasion = loose.occasion;
  if (occasion === 'memorial' || occasion === 'funeral') return 'quiet';
  return getEventType(occasion)?.voice === 'solemn' ? 'quiet' : 'envelope';
}

export function LazyArrivalReveal(props: Props) {
  const { manifest, siteSlug } = props;
  const [load, setLoad] = useState(false);

  useEffect(() => {
    /* Same early-outs as ArrivalReveal's own arming effect: reduced
       motion, style 'off', automation, framed embeds, and the
       seen+flourished repeat visit all mean the overlay would render
       null — skip the download entirely. */
    if (resolveStyle(manifest) === 'off') return;
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch { /* no matchMedia → let the component decide */ }
    const id = requestAnimationFrame(() => {
      try {
        if (window.navigator.webdriver) return;
        if (window.self !== window.top) return;
      } catch {
        return; // cross-origin frame access threw → we're framed
      }
      let seen = false;
      try { seen = window.localStorage.getItem(`pl:arrival-seen:${siteSlug}`) === '1'; } catch { /* ignore */ }
      if (!seen) {
        setLoad(true); // first visit → envelope / quiet arrival
        return;
      }
      let flourished = true;
      try { flourished = window.sessionStorage.getItem(`pl:arrival-flourish:${siteSlug}`) === '1'; } catch { /* ignore */ }
      if (!flourished) setLoad(true); // return visit → thread flourish
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteSlug]);

  if (!load) return null;
  return <ArrivalReveal {...props} />;
}
