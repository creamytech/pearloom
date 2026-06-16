// ─────────────────────────────────────────────────────────────
// Pearloom / lib/guest-tokens.ts
//
// A guest's personal link is the site URL + `?g=<token>`. The
// token is the capability: opening it shows the addressed
// envelope (ArrivalReveal), auto-recognizes the guest in the
// RSVP modal, and passes the invitation-only gate.
//
// History left two token columns on the `guests` row:
//   • guest_token    — read by /api/rsvp's gate, the dashboard's
//                      links, text/email invites, live-update CTAs.
//   • passport_token — read by /api/sites/guest-passport (the
//                      envelope's name resolver) + minted by the
//                      plus-one flow.
// We mint ONE value into BOTH so a single `?g=` link works for
// every surface regardless of which column it reads. New code
// should prefer guest_token; passport_token is kept in sync for
// the envelope resolver and legacy rows.
// ─────────────────────────────────────────────────────────────

/** An opaque, URL-safe personal token. 32 hex chars (128 bits) —
 *  short enough for a QR / SMS link, wide enough that it can't be
 *  guessed. Uses the platform crypto global (Node 18+ + browsers). */
export function mintGuestToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/** The DB columns a freshly-minted token should be written to, so
 *  every reader (gate, dashboard, envelope, plus-one) resolves the
 *  same `?g=` value. Spread into an insert/update row. */
export function guestTokenColumns(token = mintGuestToken()): {
  guest_token: string;
  passport_token: string;
} {
  return { guest_token: token, passport_token: token };
}
