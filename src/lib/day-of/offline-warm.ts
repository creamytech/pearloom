// ─────────────────────────────────────────────────────────────
// Pearloom / lib/day-of/offline-warm.ts
//
// THE BARN PROBLEM.
//
// The day-of surfaces — the run of show, who to call, the seating
// chart — are needed at exactly the moment the network is worst:
// inside a stone barn, on a beach, in a basement ballroom, on a
// venue's overloaded guest wifi. A coordinator opening "who to
// call" and getting a spinner is the single most expensive
// failure in the product, because there is no second chance and no
// support desk at 4pm on a Saturday.
//
// The service worker already network-first caches API GETs, so the
// data survives once fetched. The gap is that nobody fetches it
// while signal is good: the coordinator opens the app FOR THE
// FIRST TIME at the venue, offline, with an empty cache.
//
// This module closes that: a deliberate warm of exactly the
// endpoints the day needs, fired while the host still has signal
// (the day-of page on mount, and the days before). After that the
// SW serves them from cache when the network is gone.
//
// DESIGN NOTES:
//   • Read-only GETs only. Warming must never mutate anything.
//   • Fire-and-forget and individually caught — a warm that fails
//     is invisible, never an error the host has to think about.
//   • Skipped entirely when offline (nothing to warm from) and
//     when the SW isn't controlling the page (nothing would cache).
//   • Bounded: a fixed, small endpoint list. This is a warm, not a
//     prefetch-everything.
// ─────────────────────────────────────────────────────────────

/** The endpoints the day genuinely cannot run without. Ordered by
 *  how badly they're needed if only some make it. */
export function dayOfWarmUrls(siteId: string): string[] {
  const id = encodeURIComponent(siteId);
  return [
    // Who to call — the vendor book. First because a missing
    // florist number at 4pm is the worst-case failure.
    `/api/vendors/book?siteId=${id}`,
    // The run of show + the roster it's read against.
    `/api/guests?siteId=${id}`,
    // Seating — "where do I sit" is the most-asked question of the
    // day, and the chart is useless if it needs signal.
    `/api/seating?siteId=${id}`,
    // The music the room is running on.
    `/api/song-requests?siteId=${id}`,
    // Toasts, in order.
    `/api/toasts?siteId=${id}`,
  ];
}

export interface WarmResult {
  attempted: number;
  warmed: number;
  /** True when we skipped without trying (offline, or no SW). */
  skipped: boolean;
}

/** Is a service worker actually controlling this page? Without one
 *  a warm fetch caches nothing and is pure waste. */
function serviceWorkerControlling(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    !!navigator.serviceWorker.controller
  );
}

/**
 * Warm the day-of cache. Safe to call repeatedly; the SW's
 * network-first policy refreshes each entry.
 *
 * Never throws — the caller can `void` it.
 */
export async function warmDayOfCache(
  siteId: string,
  opts?: { fetchImpl?: typeof fetch },
): Promise<WarmResult> {
  const urls = siteId?.trim() ? dayOfWarmUrls(siteId.trim()) : [];
  if (urls.length === 0) return { attempted: 0, warmed: 0, skipped: true };

  // Offline right now → nothing to warm from. Not an error: the
  // cache either already has what it needs or this device never
  // had signal, and neither is fixable here.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { attempted: 0, warmed: 0, skipped: true };
  }
  if (!opts?.fetchImpl && !serviceWorkerControlling()) {
    return { attempted: 0, warmed: 0, skipped: true };
  }

  const doFetch = opts?.fetchImpl ?? fetch;
  let warmed = 0;
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await doFetch(url, { credentials: 'include', cache: 'no-store' });
        // Any response the SW could cache counts; a 4xx means the
        // route said no, which is a real answer worth having offline
        // rather than a spinner.
        if (res) warmed += 1;
      } catch {
        // One failed warm never fails the rest.
      }
    }),
  );

  return { attempted: urls.length, warmed, skipped: false };
}
