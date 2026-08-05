// ─────────────────────────────────────────────────────────────
// Pearloom / lib/wallet/pass-content.ts
//
// What a guest's wallet pass SAYS — one neutral shape that both
// Apple and Google serialize from, so the two platforms can never
// drift into telling a guest different things.
//
// TWO RULES, both learned elsewhere in this codebase:
//
// 1. A PASS IS NOT A ROSTER. It travels in a wallet, gets shown at
//    a door, and appears on a lock screen. It carries the bearer's
//    own details and the event's public logistics — never another
//    guest, never a table-mate's name, never money, never the
//    host's account email. Same contract as the vendor packet and
//    the printable briefcase.
//
// 2. A MEMORIAL IS NOT A TICKET. Wallet passes are built for
//    concerts, and their default vocabulary — admission, doors,
//    "event ticket" — would be grotesque on a funeral. Solemn
//    occasions get their own register here, not a celebratory
//    template with the colours changed.
//
// Pure and platform-free: no Apple types, no Google types, no I/O.
// ─────────────────────────────────────────────────────────────

import { containerNoun } from '@/lib/celebration-naming';

export interface PassGuest {
  /** The name to show on the pass — the bearer's own. */
  name: string;
  /** Their passport token; the barcode encodes its URL. */
  token: string;
}

export interface PassSource {
  occasion?: string | null;
  /** Display title, e.g. "Emma & James". */
  title: string;
  /** ISO date (yyyy-mm-dd) of the day itself. */
  date?: string | null;
  /** Free-text start time as the host wrote it. */
  time?: string | null;
  venue?: string | null;
  venueAddress?: string | null;
  /** Dress code — the single most-asked question a pass can answer. */
  dressCode?: string | null;
  /** Public site URL, for the pass's "more info" link. */
  siteUrl?: string | null;
}

export interface PassField {
  key: string;
  label: string;
  value: string;
}

export interface PassContent {
  /** Line at the top — the celebration, not the guest. */
  organizationName: string;
  /** Bold headline on the pass face. */
  primary: PassField;
  secondary: PassField[];
  auxiliary: PassField[];
  back: PassField[];
  /** What the barcode encodes — the guest's own passport. */
  barcodeMessage: string;
  /** Shown under the barcode; a human can read it if scanning fails. */
  barcodeAltText: string;
  /** Solemn occasions suppress celebratory chrome entirely. */
  solemn: boolean;
  /** Relevance/label vocabulary already resolved for the occasion. */
  vocabulary: {
    /** What the event is called on the pass. */
    eventLabel: string;
    /** Label above the date. */
    whenLabel: string;
    /** Label above the venue. */
    whereLabel: string;
    /** Label above the guest's own name. */
    bearerLabel: string;
  };
}

function clean(v: unknown, max = 120): string {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  return s.slice(0, max);
}

/** Human date — "Saturday, 12 September 2027" — without a clock read. */
export function formatPassDate(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

/**
 * Build the pass content for one guest.
 *
 * Every field is optional at the source, and anything missing is
 * omitted rather than filled with a placeholder — a pass reading
 * "Venue: TBD" on a lock screen is worse than one that simply
 * doesn't mention a venue yet.
 */
export function buildPassContent(source: PassSource, guest: PassGuest, siteUrl: string): PassContent {
  const noun = containerNoun(source.occasion);
  const solemn = noun === 'remembrance';

  const vocabulary = solemn
    ? { eventLabel: 'Service', whenLabel: 'When', whereLabel: 'Where', bearerLabel: 'This pass belongs to' }
    : { eventLabel: 'Celebration', whenLabel: 'When', whereLabel: 'Where', bearerLabel: 'Admits' };

  const dateText = formatPassDate(source.date);
  const time = clean(source.time, 40);
  const venue = clean(source.venue);
  const address = clean(source.venueAddress, 160);
  const dress = clean(source.dressCode, 80);

  const secondary: PassField[] = [];
  if (dateText) {
    secondary.push({
      key: 'when',
      label: vocabulary.whenLabel,
      value: time ? `${dateText} · ${time}` : dateText,
    });
  }
  if (venue) secondary.push({ key: 'where', label: vocabulary.whereLabel, value: venue });

  const auxiliary: PassField[] = [
    { key: 'bearer', label: vocabulary.bearerLabel, value: clean(guest.name, 60) || 'Guest' },
  ];
  // A dress code is the question guests ask most and the one a
  // wallet pass is best placed to answer — but never on a funeral,
  // where "what to wear" is not a detail anyone needs prompting on.
  if (dress && !solemn) auxiliary.push({ key: 'dress', label: 'What to wear', value: dress });

  const back: PassField[] = [];
  if (address) back.push({ key: 'address', label: vocabulary.whereLabel, value: address });
  back.push({ key: 'site', label: 'The website', value: siteUrl });
  back.push({
    key: 'note',
    label: 'About this pass',
    value: solemn
      ? 'Kept for you by Pearloom. Show it at the door if you need to.'
      : 'Kept for you by Pearloom. Scan the code to open your own page — RSVP, details, and anything the hosts add later.',
  });

  return {
    organizationName: clean(source.title, 80) || 'Pearloom',
    primary: { key: 'event', label: vocabulary.eventLabel, value: clean(source.title, 80) || 'Pearloom' },
    secondary,
    auxiliary,
    back,
    barcodeMessage: `${siteUrl.replace(/\/+$/, '')}/g/${encodeURIComponent(guest.token)}`,
    barcodeAltText: clean(guest.name, 40) || 'Your pass',
    solemn,
    vocabulary,
  };
}
