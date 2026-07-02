// ─────────────────────────────────────────────────────────────
// Pearloom / lib/guest-track.ts
//
// Fire-and-forget RSVP-funnel pings from the published site. Reads
// the guest's personal token from the URL (?g=<passport_token>) and
// stamps the funnel column server-side (idempotent). No token → no
// ping (anonymous visitors aren't in the funnel). Never throws, never
// blocks the guest — analytics must not affect the guest experience.
// ─────────────────────────────────────────────────────────────

export type GuestFunnelEvent = 'opened' | 'started';

// Per-load de-dupe so a re-render or repeated form-open doesn't spam
// the endpoint (the server is idempotent too, but this saves calls).
const sent = new Set<string>();

export function guestTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const p = new URLSearchParams(window.location.search);
    const t = (p.get('g') || p.get('guest') || '').trim();
    return t || null;
  } catch {
    return null;
  }
}

export function trackGuestFunnel(event: GuestFunnelEvent): void {
  const token = guestTokenFromUrl();
  if (!token) return;
  const key = `${event}:${token}`;
  if (sent.has(key)) return;
  sent.add(key);
  try {
    void fetch('/api/guests/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, event }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never block the guest */
  }
}
