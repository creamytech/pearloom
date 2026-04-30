/** Parse a date string the way a host expects.
 *
 *  ISO date-only values like "2026-09-12" must be read as a
 *  local-date, not UTC midnight — otherwise renderers west of
 *  UTC display the day before. (`new Date('2026-09-12')` parses
 *  as UTC midnight, which is Sep 11 23:00 in PT.)
 *
 *  Bare YYYY-MM-DD → local-time Date with that calendar day.
 *  Anything else (full ISO with time, RFC 2822, etc.) goes
 *  through the Date constructor unchanged because those carry
 *  their own timezone semantics.
 *
 *  Returns null for empty / unparseable input.
 */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(trimmed);
  if (dateOnly) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
