'use client';

// ─────────────────────────────────────────────────────────────
// LazySiteToast — event-gated loader for SiteToast.
//
// SiteToast is tiny but it imports framer-motion; on the published
// site nothing else needs framer until a guest interacts. Toasts
// only ever follow a guest action (`pl-site-toast` from rsvp-bus /
// the RSVP modal), so keep a bare listener mounted and import the
// real toast on the first message. The triggering message is handed
// to SiteToast as `initialMessage` so nothing is dropped while the
// chunk is in flight; later messages flow through the component's
// own listener as before.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const SiteToast = dynamic(
  () => import('./SiteToast').then((m) => m.SiteToast),
  { ssr: false },
);

interface Props {
  theme: Record<string, string>;
}

export function LazySiteToast({ theme }: Props) {
  const [firstMsg, setFirstMsg] = useState<string | null>(null);

  useEffect(() => {
    /* Stays listening even after the real toast mounts: messages
       that land while the chunk is still in flight update
       `initialMessage` (last one wins — matching the single-slot
       toast), and once SiteToast is live its own listener renders
       them; this listener's re-render is then visually inert. */
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      const message = typeof detail?.message === 'string' ? detail.message.trim() : '';
      if (message) setFirstMsg(message);
    };
    window.addEventListener('pl-site-toast', onToast);
    return () => window.removeEventListener('pl-site-toast', onToast);
  }, []);

  if (firstMsg === null) return null;
  return <SiteToast theme={theme} initialMessage={firstMsg} />;
}
