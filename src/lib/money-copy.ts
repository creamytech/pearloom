// ─────────────────────────────────────────────────────────────
// Pearloom / lib/money-copy.ts
//
// One voice for a till that can't take the payment (M.8 —
// NEW-USER-REVAMP L83). The checkout routes answer degraded
// states in infrastructure-speak ("Payments are not configured.",
// "Stripe not configured") — correct for a log line, hostile on a
// money surface. Every checkout UI (the /upgrade door, the
// settings plan buttons, the store cart) routes its failure text
// through here so a host always reads three things: what
// happened, that NOTHING WAS CHARGED, and what to do next.
//
// The server strings stay as they are — they're API contract and
// log-grepable. Only the rendered sentence changes.
// ─────────────────────────────────────────────────────────────

/** True when the server's error means "this deploy has no payment
 *  keys" — the honest keyless state, not a transient failure. */
export function isPaymentsUnconfigured(status: number | null, serverError?: string | null): boolean {
  if (status === 503) return true;
  return !!serverError && /not configured|stripe/i.test(serverError);
}

/**
 * Host-language sentence for a failed checkout attempt.
 * @param status HTTP status of the failed response (null if the
 *   request itself never resolved).
 * @param serverError The server's `error` string, if any — consulted
 *   for classification, never rendered verbatim.
 */
export function humanizeCheckoutError(status: number | null, serverError?: string | null): string {
  if (isPaymentsUnconfigured(status, serverError)) {
    return (
      'Payments aren’t switched on here yet, so nothing was charged. '
      + 'Write to hello@pearloom.com and we’ll take care of you the moment they are.'
    );
  }
  if (status === 401) {
    return 'You’re signed out. Sign in and try again — nothing was lost.';
  }
  if (status === 429) {
    return 'A few too many tries in a row. Give it a minute, then try again — nothing was charged.';
  }
  return 'Checkout is unavailable right now — nothing was charged. Try again in a minute.';
}
