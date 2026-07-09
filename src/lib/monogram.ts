// ─────────────────────────────────────────────────────────────
// Pearloom / lib/monogram.ts
//
// deriveInitials — couple vs solo-honoree crest derivation.
//
// Pure, server-safe (no React, no DOM, no 'use client'). Lives in
// lib/ — NOT in the Monogram component — so server code can call it
// without tripping React's "invoked a client function from the
// server" guard. The <Monogram> client component re-exports it for
// existing client consumers; suite/theme.ts and the guest passport
// page (both server) import it from here.
// ─────────────────────────────────────────────────────────────

/**
 * Derive 1–2 display initials from a name/subject string.
 *
 * - A short token already in initials form ('EJ', 'E&J', 'E') is
 *   honoured verbatim.
 * - A couple source ('Emma & James', 'Scott Shauna') yields two.
 * - `solo: true` collapses to a single initial — a full honoree
 *   name ('Eleanor Rose Thompson') must not read its middle name as
 *   a partner.
 */
export function deriveInitials(
  subject?: string | null,
  opts?: { solo?: boolean },
): { initA: string; initB: string; raw: string } {
  const s = (subject || '').trim();
  const solo = opts?.solo === true;
  if (!s) return solo ? { initA: 'A', initB: '', raw: 'A' } : { initA: 'A', initB: 'B', raw: 'A & B' };
  // If caller passed a single 1-3 char string (already in initials form)
  // e.g. 'EJ' or 'E&J', honour it verbatim.
  if (s.length <= 3 && !/\s/.test(s)) {
    const stripped = s.replace(/[^A-Za-z]/g, '');
    if (solo && stripped.length >= 1) return { initA: stripped[0].toUpperCase(), initB: '', raw: s };
    if (stripped.length === 1) return { initA: stripped[0].toUpperCase(), initB: '', raw: s };
    if (stripped.length === 2) return { initA: stripped[0].toUpperCase(), initB: stripped[1].toUpperCase(), raw: s };
    if (stripped.length === 3) return { initA: stripped[0].toUpperCase(), initB: stripped[2].toUpperCase(), raw: s };
  }
  const parts = s.replace('&', ' ').split(/\s+/).filter(Boolean);
  const initA = (parts[0] || 'A')[0].toUpperCase();
  // Solo honoree — one person, one initial. A single name ('Eleanor')
  // gets it implicitly; a full name ('Eleanor Rose Thompson') needs the
  // explicit flag so the middle name doesn't read as a partner.
  if (solo || parts.length <= 1) return { initA, initB: '', raw: s };
  const initB = (parts[1] || parts[2])[0].toUpperCase();
  return { initA, initB, raw: s };
}
