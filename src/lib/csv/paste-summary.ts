// ─────────────────────────────────────────────────────────────
// Pearloom / lib/csv/paste-summary.ts
//
// What a host is told, BEFORE they commit a paste.
//
// The tolerant parser (parse-guest-list) reads what people
// actually have. This turns its result into the one sentence the
// host needs to trust it: how many people we found, how many
// carry an email, and a few names back so they can see their own
// list recognised rather than a promise that it worked.
//
// It exists as a pure module rather than inline JSX so the counting
// rules are testable — the failure mode we care about is a
// confident "12 guests" over a parse that actually found 3.
// ─────────────────────────────────────────────────────────────

import type { ParseResult } from './parse-guests';

export interface PasteSummary {
  /** People we could read. */
  count: number;
  /** How many of those carry an email — the ones we can invite. */
  withEmail: number;
  /** Lines we could make nothing of. */
  unreadable: number;
  /** First few names, verbatim, so the host recognises their list. */
  sample: string[];
  /** The whole sentence, ready to render. */
  sentence: string;
}

const SAMPLE_SIZE = 3;

/**
 * Describe a parse in plain words.
 *
 * Says nothing when there's nothing to say (an empty paste gets an
 * empty sentence, not "0 guests found" — the host hasn't done
 * anything wrong yet).
 */
export function summarizeGuestPaste(result: ParseResult | null | undefined): PasteSummary {
  const guests = result?.guests ?? [];
  const rejected = result?.rejected ?? [];
  const count = guests.length;
  const withEmail = guests.filter((g) => Boolean(g.email)).length;
  const sample = guests.slice(0, SAMPLE_SIZE).map((g) => g.name).filter(Boolean);

  if (count === 0 && rejected.length === 0) {
    return { count: 0, withEmail: 0, unreadable: 0, sample: [], sentence: '' };
  }

  if (count === 0) {
    return {
      count: 0,
      withEmail: 0,
      unreadable: rejected.length,
      sample: [],
      sentence: 'We couldn’t read any names in that. One person per line works best — a name, an email, or both.',
    };
  }

  const people = count === 1 ? '1 person' : `${count} people`;
  // Only mention email when it changes what the host can do next.
  const emailPart =
    withEmail === 0 ? ', none with an email yet'
    : withEmail === count ? ', all with an email'
    : `, ${withEmail} with an email`;
  const leftover = rejected.length > 0
    ? ` ${rejected.length} line${rejected.length === 1 ? '' : 's'} we couldn’t read.`
    : '';

  return {
    count,
    withEmail,
    unreadable: rejected.length,
    sample,
    sentence: `Found ${people}${emailPart}.${leftover}`,
  };
}
