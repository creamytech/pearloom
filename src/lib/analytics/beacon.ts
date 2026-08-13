// ─────────────────────────────────────────────────────────────
// Pearloom / lib/analytics/beacon.ts
//
// Tiny CLIENT-side funnel beacon (GRAND-PLAN Pillar 20). Fires a
// non-blocking POST to /api/events for the client funnel steps the
// server can't see — welcome-flow and wizard drop-off, landing →
// signup. keepalive:true so an in-flight beacon survives a
// navigation. SSR-guarded and fully swallowed — a telemetry beacon
// must never surface as an app error or block the UI.
//
// (Server-side events use lib/analytics/product-events.ts directly;
//  this module is browser-safe and pulls in no server deps.)
// ─────────────────────────────────────────────────────────────

export function trackEvent(
  event: string,
  props?: Record<string, unknown>,
  siteId?: string,
): void {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
  try {
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, props: props ?? null, siteId: siteId ?? null }),
      keepalive: true,
      credentials: 'include',
    }).catch(() => {
      /* beacon is best-effort — never surfaces */
    });
  } catch {
    /* never throw from a beacon */
  }
}
