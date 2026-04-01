/**
 * Pearloom / lib/date.ts
 * Date utilities that avoid the UTC-midnight off-by-one bug.
 *
 * `new Date("2024-06-15")` is interpreted as UTC midnight. In any negative-UTC
 * timezone (e.g. US Eastern = UTC-5) that renders as June 14 locally. This
 * module provides helpers that parse "YYYY-MM-DD" strings in LOCAL time instead.
 */

/**
 * Parse a "YYYY-MM-DD" date string in local time.
 * Falls back to native Date parsing for strings that include a time component.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  if (dateStr.includes('T') || dateStr.includes(' ')) return new Date(dateStr);
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date(dateStr);
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

/**
 * Format a date string for display using local-time parsing.
 * Drop-in replacement for `new Date(str).toLocaleDateString(locale, opts)`.
 */
export function formatLocalDate(
  dateStr: string,
  opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' },
  locale = 'en-US',
): string {
  try {
    return parseLocalDate(dateStr).toLocaleDateString(locale, opts);
  } catch {
    return dateStr;
  }
}
