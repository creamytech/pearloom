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

/** Whole-CALENDAR-day difference between two dates, ignoring
 *  time-of-day. `(a.getTime() - b.getTime()) / 86_400_000` with
 *  Math.round looks close enough but drifts near midnight — an
 *  event dated "today" reads as already past for most of the day
 *  (now is always later than today's midnight) and can round to
 *  -1 in the evening. Re-zero both dates to LOCAL midnight before
 *  subtracting so the sign and magnitude are exact all day long —
 *  this is the fix for "an ended event still says today": the old
 *  raw-ms math got clamped to 0 downstream and could never tell a
 *  3-week-old event from one happening right now. */
export function daysBetweenCalendarDates(target: Date, from: Date): number {
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  return Math.round((t - f) / 86_400_000);
}

/** "3 weeks ago" / "yesterday" / "a year ago" — the shared past-
 *  tense formatter for any card that shows a date which may have
 *  already happened. `daysAgo` is the (positive) number of days
 *  since; 0 or negative reads as "today". */
export function formatDaysAgo(daysAgo: number): string {
  if (daysAgo <= 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  if (daysAgo < 14) return `${daysAgo} days ago`;
  if (daysAgo < 60) return `${Math.round(daysAgo / 7)} weeks ago`;
  if (daysAgo < 365) return `${Math.round(daysAgo / 30)} months ago`;
  const years = Math.round(daysAgo / 365);
  return years <= 1 ? 'a year ago' : `${years} years ago`;
}
