/**
 * Pearloom / lib/date.ts
 *
 * Thin compatibility shim — the canonical implementation lives in
 * @/lib/date-utils (returns Date | null). This module preserves the
 * older never-null API (returns Date with NaN for invalid input) so
 * existing call sites that chain .toLocaleDateString() / .getTime()
 * directly don't need null-guards.
 *
 * New code should import from @/lib/date-utils directly. This module
 * stays so the migration can happen incrementally.
 */

import { parseLocalDate as parseLocalDateOrNull, formatLocalDate as formatLocalDateImpl } from './date-utils';

/**
 * Parse a "YYYY-MM-DD" date string in local time. Returns Date with
 * NaN for invalid input (legacy API). Prefer @/lib/date-utils for
 * new code (returns Date | null).
 */
export function parseLocalDate(dateStr: string): Date {
  return parseLocalDateOrNull(dateStr) ?? new Date(NaN);
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
  // The canonical formatLocalDate returns '' for missing/invalid;
  // legacy callers expect the original string back so the UI shows
  // something rather than collapsing to empty.
  return formatLocalDateImpl(dateStr, opts, locale) || dateStr;
}
