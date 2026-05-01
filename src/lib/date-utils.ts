// ─────────────────────────────────────────────────────────────
// Pearloom / lib/date-utils.ts
//
// `new Date('2026-09-14')` is parsed as UTC midnight per the
// ECMAScript spec. When toLocaleDateString runs in a -ve UTC
// offset (every US timezone), the displayed date shifts back a
// day. The host picks Sept 14, the canvas shows Sept 13.
//
// parseLocalDate fixes this by appending `T00:00:00` to date-only
// strings before parsing — the result is local midnight, which
// renders correctly everywhere. Pass-through for full ISO
// timestamps or already-local strings.
// ─────────────────────────────────────────────────────────────

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseLocalDate(iso?: string | null): Date | null {
  if (!iso) return null;
  // Date-only ISO → coerce to local midnight to dodge the UTC
  // off-by-one timezone bug.
  const normalized = DATE_ONLY_RE.test(iso) ? `${iso}T00:00:00` : iso;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Convenience: parses + formats with the en-US default. Returns
 *  empty string when the input is missing or unparseable. */
export function formatLocalDate(
  iso?: string | null,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
  locale = 'en-US',
): string {
  const d = parseLocalDate(iso);
  if (!d) return '';
  return d.toLocaleDateString(locale, options);
}

/** Today as YYYY-MM-DD in the user's local time. Avoid
 *  `new Date().toISOString().slice(0, 10)` for this — that
 *  returns the UTC calendar day, which is tomorrow for any
 *  user west of UTC after their local 4–8 PM. Use this for
 *  any "what's today's date" stamp written into a manifest
 *  field that another local renderer will read back. */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
