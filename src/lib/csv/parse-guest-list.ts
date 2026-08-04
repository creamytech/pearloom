// ─────────────────────────────────────────────────────────────
// Pearloom / lib/csv/parse-guest-list.ts
//
// WHAT PEOPLE ACTUALLY PASTE.
//
// The CSV importer is good, and it needs a header row. Almost
// nobody has one. What a host actually has is a messy list — from
// Notes, a group chat, a half-finished spreadsheet:
//
//     Emma Doyle <emma@x.com>
//     James Reyes, james@y.com
//     Sam Okafor	sam@z.com
//     Aunt Prue
//
// Feeding that to a header-expecting parser silently eats the
// first guest as a header row. Review #3 named the guest-list
// importer as a doorway of its own; this is the tolerant front
// door to it.
//
// `parseGuestList` DISPATCHES: if the text has a recognizable
// header, the real CSV parser handles it unchanged (all its
// header-aliasing, address columns, and plus-one handling intact).
// Otherwise each line is read on its own terms. Either way the
// return shape is identical, so nothing downstream changes.
// ─────────────────────────────────────────────────────────────

import { parseGuestCsv, type ParsedGuest, type ParseResult } from './parse-guests';

/** Header tokens strong enough to mean "this is a real CSV". */
const HEADER_SIGNALS = [
  'name', 'email', 'e-mail', 'first name', 'last name', 'guest',
  'phone', 'address', 'party', 'plus one', 'plus-one',
];

/**
 * Does the first line look like a header row rather than a guest?
 *
 * Conservative in the direction that matters: a line containing an
 * `@` is a person, never a header, so "emma@x.com" can't be eaten.
 */
export function looksLikeHeaderRow(firstLine: string): boolean {
  const line = firstLine.trim().toLowerCase();
  if (!line) return false;
  // An email address in row 1 means it's data.
  if (line.includes('@')) return false;
  const cells = line.split(/[,\t;]/).map((c) => c.trim()).filter(Boolean);
  if (cells.length === 0) return false;
  const matches = cells.filter((c) => HEADER_SIGNALS.includes(c)).length;
  // Either every cell is a known header word, or at least two are.
  return matches === cells.length || matches >= 2;
}

const EMAIL_RX = /[^\s<>,;]+@[^\s<>,;]+\.[^\s<>,;]+/;

function blankGuest(rowIndex: number): ParsedGuest {
  return {
    name: '',
    email: null, phone: null, party_label: null,
    plus_one: false, plus_one_name: null, plus_one_count: 0,
    mailing_address_line1: null, mailing_address_line2: null,
    city: null, state: null, postal_code: null, country: null,
    meal_preference: null, dietary_restrictions: null,
    rowIndex,
    warnings: [],
  };
}

/** Strip the punctuation a pasted name picks up. */
function cleanName(raw: string): string {
  return raw
    .replace(/[<>"']/g, ' ')
    .replace(/[,;\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Parse one pasted line into a guest. Handles:
 *   "Emma Doyle <emma@x.com>"   "Emma Doyle, emma@x.com"
 *   "Emma Doyle\temma@x.com"    "emma@x.com"    "Emma Doyle"
 * Returns null for a line with nothing usable.
 */
export function parseGuestLine(line: string, rowIndex: number): ParsedGuest | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const guest = blankGuest(rowIndex);
  const emailMatch = trimmed.match(EMAIL_RX);

  if (emailMatch) {
    guest.email = emailMatch[0].toLowerCase();
    const name = cleanName(trimmed.replace(emailMatch[0], ' '));
    if (name) {
      guest.name = name;
    } else {
      // Email only — use the local part as a provisional name so the
      // row is usable, and SAY SO rather than presenting a guess as
      // a fact the host didn't give us.
      guest.name = guest.email.split('@')[0].replace(/[._-]+/g, ' ').trim();
      guest.warnings.push('No name on this line — used the email’s first part.');
    }
    return guest;
  }

  const name = cleanName(trimmed);
  if (!name) return null;
  // A bare line that is obviously not a person (a stray URL, a
  // header word that slipped through) is rejected by the caller via
  // the empty-name check; everything else is a name without an email.
  guest.name = name;
  return guest;
}

/**
 * The tolerant front door. Dispatches to the CSV parser when the
 * text carries a header row, and reads it line-by-line otherwise.
 */
export function parseGuestList(text: string): ParseResult {
  const raw = (text ?? '').replace(/\r\n?/g, '\n');
  const lines = raw.split('\n');
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) ?? '';

  if (looksLikeHeaderRow(firstNonEmpty)) {
    return parseGuestCsv(raw);
  }

  const guests: ParsedGuest[] = [];
  const rejected: { rowIndex: number; reason: string }[] = [];

  lines.forEach((line, i) => {
    if (!line.trim()) return;
    const rowIndex = i + 1;
    const guest = parseGuestLine(line, rowIndex);
    if (!guest || !guest.name) {
      rejected.push({ rowIndex, reason: 'Couldn’t read a name or email on this line.' });
      return;
    }
    guests.push(guest);
  });

  return { guests, headerMap: {}, rejected };
}
