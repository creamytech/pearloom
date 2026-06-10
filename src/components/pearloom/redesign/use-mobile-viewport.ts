'use client';

/* useMobileViewport — viewport-level mobile detection for the
   editor shell. NOT the same thing as the canvas's "Mobile"
   preview pill (EditorMode === 'mobile') — that one shrinks the
   device frame on a desktop screen; this one reports that the
   actual browser viewport is phone-sized so the shell can swap
   the three-column grid for the bottom-bar + sheet chrome.

   SSR-safe: defaults to false on the server + first client
   paint, then a matchMedia listener takes over. The one-frame
   desktop flash on a phone is acceptable — the alternative
   (reading matchMedia in a useState initializer) hydrates
   differently from the server HTML and trips React. */

import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

export function useMobileViewport(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(mq.matches);
    update();
    /* Safari < 14 only has addListener; modern path first. */
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);
  return mobile;
}
