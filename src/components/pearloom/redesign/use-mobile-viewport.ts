'use client';

/* useMobileViewport — viewport-level mobile detection for the
   editor shell. NOT the same thing as the canvas's "Mobile"
   preview pill (EditorMode === 'mobile') — that one shrinks the
   device frame on a desktop screen; this one reports that the
   actual browser viewport is phone-sized so the shell can swap
   the three-column grid for the bottom-bar + sheet chrome.

   useSyncExternalStore, not a useState + effect: the old shape
   defaulted to `false` and corrected itself in an effect, which
   PAINTED a desktop editor frame on phones before flipping —
   the flash users reported when first opening the editor. With
   uSES the server render (and hydration render) use the server
   snapshot, and React re-syncs against the real matchMedia
   snapshot before the browser paints — mobile gets mobile on
   the first visible frame, and hydration never mismatches. */

import { useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

let mq: MediaQueryList | null = null;
function ensureMq(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  if (!mq) mq = window.matchMedia(MOBILE_QUERY);
  return mq;
}

function subscribe(cb: () => void): () => void {
  const m = ensureMq();
  if (!m) return () => {};
  /* Safari < 14 only has addListener; modern path first. */
  if (typeof m.addEventListener === 'function') {
    m.addEventListener('change', cb);
    return () => m.removeEventListener('change', cb);
  }
  m.addListener(cb);
  return () => m.removeListener(cb);
}

function getSnapshot(): boolean {
  return ensureMq()?.matches ?? false;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useMobileViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
