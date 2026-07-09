// ─────────────────────────────────────────────────────────────
// Pearloom / lib/rsvp-status.ts
//
// The ONE RSVP-status normaliser. guests.status carries free-ish
// strings from several writers ('yes' | 'attending' | 'confirmed'
// | 'declined' | 'tentative' | …); every surface that buckets them
// must agree or the dashboard contradicts itself (a guest counted
// as "coming" on the Guests page but "not replied" in the
// Analytics funnel). Used by DashGuests, DashAnalytics and
// /api/dashboard/sites-stats — add new writers' vocabularies here,
// never inline.
// ─────────────────────────────────────────────────────────────

export type RsvpStatusKey = 'yes' | 'no' | 'maybe' | 'pending';

export function normaliseRsvpStatus(s: string | null | undefined): RsvpStatusKey {
  const v = String(s ?? '').toLowerCase();
  if (v === 'attending' || v === 'yes' || v === 'confirmed') return 'yes';
  if (v === 'declined' || v === 'no') return 'no';
  if (v === 'maybe' || v === 'tentative') return 'maybe';
  return 'pending';
}

/** A guest has replied when their status resolves to anything but pending. */
export function hasReplied(s: string | null | undefined): boolean {
  return normaliseRsvpStatus(s) !== 'pending';
}
