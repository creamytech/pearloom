// ─────────────────────────────────────────────────────────────
// parse-guest-list — the tolerant front door to guest import.
//
// The failure this prevents: a host pastes their list, the
// header-expecting CSV parser eats the first line as a header, and
// one guest silently vanishes. Someone's aunt doesn't get invited
// and nobody finds out until the day.
//
// So the properties under test are: a real CSV still routes to the
// real parser untouched, a headerless paste loses NO line, and a
// line containing an email can never be mistaken for a header.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { parseGuestList, parseGuestLine, looksLikeHeaderRow } from './parse-guest-list';

describe('looksLikeHeaderRow', () => {
  it('recognizes real header rows', () => {
    expect(looksLikeHeaderRow('name,email')).toBe(true);
    expect(looksLikeHeaderRow('Name, Email, Phone')).toBe(true);
    expect(looksLikeHeaderRow('first name\tlast name\temail')).toBe(true);
  });

  it('NEVER treats a line with an email as a header — that would eat a guest', () => {
    expect(looksLikeHeaderRow('emma@x.com')).toBe(false);
    expect(looksLikeHeaderRow('Emma Doyle <emma@x.com>')).toBe(false);
    // Even when it also contains header-ish words.
    expect(looksLikeHeaderRow('name, emma@x.com')).toBe(false);
  });

  it('does not mistake a single name for a header', () => {
    expect(looksLikeHeaderRow('Emma Doyle')).toBe(false);
    expect(looksLikeHeaderRow('Aunt Prue')).toBe(false);
    expect(looksLikeHeaderRow('')).toBe(false);
  });
});

describe('parseGuestLine — the shapes people paste', () => {
  it('reads "Name <email>"', () => {
    const g = parseGuestLine('Emma Doyle <emma@x.com>', 1)!;
    expect(g.name).toBe('Emma Doyle');
    expect(g.email).toBe('emma@x.com');
    expect(g.warnings).toEqual([]);
  });

  it('reads "Name, email" and "Name<TAB>email"', () => {
    expect(parseGuestLine('James Reyes, james@y.com', 1)!.name).toBe('James Reyes');
    expect(parseGuestLine('James Reyes, james@y.com', 1)!.email).toBe('james@y.com');
    const tabbed = parseGuestLine('Sam Okafor\tsam@z.com', 1)!;
    expect(tabbed.name).toBe('Sam Okafor');
    expect(tabbed.email).toBe('sam@z.com');
  });

  it('reads a bare name (no email) — most lists are half like this', () => {
    const g = parseGuestLine('Aunt Prue', 1)!;
    expect(g.name).toBe('Aunt Prue');
    expect(g.email).toBeNull();
  });

  it('reads a bare email and SAYS it guessed the name', () => {
    const g = parseGuestLine('mary.beth@x.com', 1)!;
    expect(g.email).toBe('mary.beth@x.com');
    expect(g.name).toBe('mary beth');
    // Honesty: the host gave no name, so the row admits the guess.
    expect(g.warnings.join(' ')).toMatch(/no name/i);
  });

  it('lowercases emails so dedupe works', () => {
    expect(parseGuestLine('Emma <EMMA@X.COM>', 1)!.email).toBe('emma@x.com');
  });

  it('returns null for an empty line', () => {
    expect(parseGuestLine('', 1)).toBeNull();
    expect(parseGuestLine('   ', 1)).toBeNull();
  });
});

describe('parseGuestList — nothing is silently lost', () => {
  it('reads a messy paste, keeping every line', () => {
    const pasted = [
      'Emma Doyle <emma@x.com>',
      'James Reyes, james@y.com',
      'Sam Okafor\tsam@z.com',
      'Aunt Prue',
      '',
      'mary.beth@x.com',
    ].join('\n');
    const res = parseGuestList(pasted);
    expect(res.guests).toHaveLength(5);
    expect(res.guests.map((g) => g.name)).toEqual([
      'Emma Doyle', 'James Reyes', 'Sam Okafor', 'Aunt Prue', 'mary beth',
    ]);
    expect(res.rejected).toEqual([]);
  });

  it('does NOT eat the first guest when there is no header', () => {
    const res = parseGuestList('Emma Doyle <emma@x.com>\nJames Reyes');
    // The regression this file exists for: 2 in, 2 out.
    expect(res.guests).toHaveLength(2);
    expect(res.guests[0].name).toBe('Emma Doyle');
  });

  it('routes a REAL csv to the real parser, untouched', () => {
    const csv = 'name,email\nEmma Doyle,emma@x.com\nJames Reyes,james@y.com';
    const res = parseGuestList(csv);
    expect(res.guests).toHaveLength(2);
    // The CSV path reports its header mapping; the paste path doesn't.
    expect(Object.keys(res.headerMap).length).toBeGreaterThan(0);
    expect(res.guests[0].email).toBe('emma@x.com');
  });

  it('handles CRLF and trailing newlines', () => {
    const res = parseGuestList('Emma <emma@x.com>\r\nJames Reyes\r\n\r\n');
    expect(res.guests).toHaveLength(2);
  });

  it('reports unreadable lines instead of dropping them silently', () => {
    const res = parseGuestList('Emma Doyle\n<<<>>>\nJames Reyes');
    expect(res.guests).toHaveLength(2);
    expect(res.rejected).toHaveLength(1);
    expect(res.rejected[0].rowIndex).toBe(2);
  });

  it('is safe on empty input', () => {
    expect(parseGuestList('').guests).toEqual([]);
    expect(parseGuestList('   \n  ').guests).toEqual([]);
  });
});
