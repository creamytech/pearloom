// ─────────────────────────────────────────────────────────────
// Pearloom / lib/passport/recap.ts
//
// THE TRANSFER MOMENT.
//
// Weddings are episodic: the host who loved Pearloom has no second
// wedding to plan. The product only compounds if a GUEST becomes
// the next host — and the warmest moment to ask is not the invite,
// it's afterwards, when the guest opens their passport and finds
// what they were part of reflected back at them.
//
// All three external reviews independently named this the growth
// engine (docs/REVIEW-SYNTHESIS.md §1.6). This module computes the
// recap: honest figures from what the guest actually did, in the
// occasion's own register, with the "host your own" invitation
// placed after the warmth rather than before it.
//
// THREE RULES, all of them about honesty:
//
//   1. NEVER INFLATE. Every figure is a real count of a real
//      artifact. A guest who sent no photos is not told they
//      appeared in any. Zero is a legitimate answer and produces a
//      quieter recap, not a padded one.
//   2. NEVER ASK A MOURNER TO CONVERT. On a memorial the recap is
//      a remembrance, and the "plan your own" invitation is
//      SUPPRESSED entirely — turning a funeral into a funnel is
//      the single worst thing this surface could do.
//   3. ONLY AFTER. The recap belongs to the afterglow, never
//      before the day. Showing "you celebrated with 84 people"
//      to someone still waiting for the event is nonsense.
//
// Pure + client-safe: no I/O, no dates read from the clock (the
// caller passes the phase), so it is fully testable.
// ─────────────────────────────────────────────────────────────

import { getEventType } from '@/lib/event-os/event-types';
import { normalizeOccasion } from '@/lib/site-urls';

/** What the guest actually did, counted from real rows. */
export interface RecapCounts {
  /** People who attended alongside them (attending guests). */
  peopleTogether: number;
  /** Photos this guest uploaded. */
  photosSent: number;
  /** Words they wrote: guestbook, memories, whispers, capsule. */
  wordsWritten: number;
  /** Songs they suggested. */
  songsSuggested: number;
  /** Voice toasts they recorded. */
  toastsRecorded: number;
}

export interface RecapInput {
  counts: RecapCounts;
  occasion: string | null | undefined;
  /** The guest's first name, for the address line. */
  firstName?: string | null;
  /** True only once the event has passed. The caller owns "now". */
  isAfter: boolean;
}

export interface RecapLine {
  /** The number, rendered. */
  value: string;
  /** What it counts, in plain words. */
  label: string;
}

export interface Recap {
  /** Whether to render at all. */
  show: boolean;
  /** Mono eyebrow above the card. */
  eyebrow: string;
  /** The display headline. */
  headline: string;
  /** Real figures — only the non-zero ones. */
  lines: RecapLine[];
  /** A closing sentence, or null when the counts are all zero and
   *  there is nothing honest to say. */
  note: string | null;
  /** Whether to show the "plan your own" invitation. FALSE on
   *  solemn occasions — never convert a mourner. */
  inviteToHost: boolean;
}

function isSolemn(occasion: string | null | undefined): boolean {
  if (!occasion) return false;
  return getEventType(normalizeOccasion(occasion))?.voice === 'solemn';
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/**
 * Build the guest's recap. Returns `show: false` before the event
 * (there is nothing to look back on) — the caller renders nothing.
 */
export function buildRecap(input: RecapInput): Recap {
  const { counts, occasion, firstName, isAfter } = input;
  const solemn = isSolemn(occasion);

  if (!isAfter) {
    return {
      show: false,
      eyebrow: '',
      headline: '',
      lines: [],
      note: null,
      inviteToHost: false,
    };
  }

  const lines: RecapLine[] = [];
  if (counts.peopleTogether > 0) {
    lines.push({
      value: String(counts.peopleTogether),
      label: solemn
        ? plural(counts.peopleTogether, 'person gathered', 'people gathered')
        : plural(counts.peopleTogether, 'person there', 'people there'),
    });
  }
  if (counts.photosSent > 0) {
    lines.push({
      value: String(counts.photosSent),
      label: plural(counts.photosSent, 'photo you sent', 'photos you sent'),
    });
  }
  if (counts.wordsWritten > 0) {
    lines.push({
      value: String(counts.wordsWritten),
      label: plural(counts.wordsWritten, 'thing you wrote', 'things you wrote'),
    });
  }
  if (counts.songsSuggested > 0) {
    lines.push({
      value: String(counts.songsSuggested),
      label: plural(counts.songsSuggested, 'song you asked for', 'songs you asked for'),
    });
  }
  if (counts.toastsRecorded > 0) {
    lines.push({
      value: String(counts.toastsRecorded),
      label: plural(counts.toastsRecorded, 'toast you recorded', 'toasts you recorded'),
    });
  }

  const contributed =
    counts.photosSent + counts.wordsWritten + counts.songsSuggested + counts.toastsRecorded;

  // The headline addresses them by name when we have it — this is
  // their own page, not a broadcast.
  const name = (firstName ?? '').trim();
  const headline = solemn
    ? name ? `Thank you for being there, ${name}.` : 'Thank you for being there.'
    : name ? `You were part of it, ${name}.` : 'You were part of it.';

  let note: string | null;
  if (solemn) {
    note = contributed > 0
      ? 'What you shared is kept here.'
      : 'Your being there mattered.';
  } else if (contributed > 0) {
    note = 'All of it is kept here.';
  } else if (counts.peopleTogether > 0) {
    // They came but left nothing behind — say something true, not
    // a nudge disguised as a stat.
    note = 'Glad you were there.';
  } else {
    note = null;
  }

  return {
    show: true,
    eyebrow: solemn ? 'In remembrance' : 'Looking back',
    headline,
    lines,
    note,
    // RULE 2 — a memorial is never a funnel.
    inviteToHost: !solemn,
  };
}

/**
 * Has the event day passed?
 *
 * Lives here rather than in the passport page for two reasons: the
 * clock read belongs with the recap logic it gates, and React
 * Compiler's purity rule forbids `Date.now()` inside a component
 * body (CLAUDE-DESIGN §13) — a server component is still a
 * component.
 *
 * End-of-day, so the recap belongs to the day AFTER the event, not
 * to the evening of it while people are still dancing.
 *
 * `now` is injectable so this is testable without mocking time.
 */
export function hasEventPassed(
  dateIso: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!dateIso) return false;
  // yyyy-mm-dd, read as a local calendar day.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateIso.trim());
  if (!m) return false;
  const end = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
  if (Number.isNaN(end.getTime())) return false;
  return now > end.getTime();
}

/**
 * The referral link a guest carries into their own creation, with
 * attribution so guest→host conversion is measurable (the metric
 * every reviewer asked to instrument).
 *
 * Deliberately carries NO guest identity — only the site that
 * referred them. The next host's account is theirs alone, and a
 * link they might paste into a group chat must not leak who they
 * are.
 */
export function referralHref(fromSiteSlug: string | null | undefined): string {
  const slug = (fromSiteSlug ?? '').trim();
  if (!slug) return '/wizard/new';
  return `/wizard/new?ref=${encodeURIComponent(slug)}`;
}
