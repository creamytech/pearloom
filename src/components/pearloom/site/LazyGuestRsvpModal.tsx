'use client';

// ─────────────────────────────────────────────────────────────
// LazyGuestRsvpModal — on-demand loader for GuestRsvpModal.
//
// The RSVP modal (plus RsvpCeremony, the preset form machinery and
// the ICS generator it drags in) is one of the heaviest pieces of
// the published-site bundle, and most guests never open it in a
// given visit. This wrapper keeps a feather-weight listener mounted
// instead and only imports the real modal when an RSVP is actually
// requested:
//
//   • requestRsvp() (sticky pill / nav fallbacks) — rsvp-bus calls
//     the loader we register, queues the open, and the modal
//     auto-opens on mount via its existing markRsvpReady() handshake.
//   • raw `window.dispatchEvent(new CustomEvent('pl-open-rsvp'))`
//     (ThemedSite's RSVP CTAs, external integrations) — our listener
//     forwards to queueRsvpOpen(), same handshake.
//
// The rsvp-bus ready/toast contract is preserved: if the chunk never
// arrives, the bus's grace timeout still surfaces the calm toast.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { StoryManifest } from '@/types';
import { registerRsvpLoader, queueRsvpOpen } from './rsvp-bus';

const GuestRsvpModal = dynamic(
  () => import('./GuestRsvpModal').then((m) => m.GuestRsvpModal),
  { ssr: false },
);

interface Props {
  siteSlug: string;
  manifest: StoryManifest;
}

export function LazyGuestRsvpModal(props: Props) {
  const [load, setLoad] = useState(false);

  useEffect(() => {
    registerRsvpLoader(() => setLoad(true));
    /* Raw dispatches bypass requestRsvp(), so mirror the queue here.
       queueRsvpOpen() no-ops once the modal has marked itself ready —
       at that point the modal's own listener owns the event. */
    const onOpen = () => queueRsvpOpen();
    window.addEventListener('pl-open-rsvp', onOpen);
    return () => {
      window.removeEventListener('pl-open-rsvp', onOpen);
      registerRsvpLoader(null);
    };
  }, []);

  if (!load) return null;
  return <GuestRsvpModal {...props} />;
}
