'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/VisitTracker.tsx
// Invisible client component — fires a visit ping on mount.
// Drop it into any public site page.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';

interface VisitTrackerProps {
  siteId: string;
}

export function VisitTracker({ siteId }: VisitTrackerProps) {
  useEffect(() => {
    // Don't track in dev or if it's the owner (heuristic: check sessionStorage flag)
    if (process.env.NODE_ENV === 'development') return;
    if (sessionStorage.getItem(`visited-${siteId}`)) return;

    // Fire-and-forget
    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});

    // Mark as already tracked for this tab session
    sessionStorage.setItem(`visited-${siteId}`, '1');
  }, [siteId]);

  return null;
}
