// ─────────────────────────────────────────────────────────────
// paste-summary — the sentence a host reads before committing.
//
// The failure that matters is a confident count over a bad parse:
// "Found 12 people" when three lines were actually read. So these
// tests run the REAL parser over what people actually paste and
// assert the sentence against the truth, rather than stubbing a
// result shape that can drift from the parser.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { parseGuestList } from './parse-guest-list';
import { summarizeGuestPaste } from './paste-summary';

const sum = (text: string) => summarizeGuestPaste(parseGuestList(text));

describe('a messy paste, described honestly', () => {
  const PASTED = [
    'Emma Doyle <emma@x.com>',
    'James Reyes, james@y.com',
    'Sam Okafor\tsam@z.com',
    'Aunt Prue',
  ].join('\n');

  it('counts people and emails separately', () => {
    const s = sum(PASTED);
    expect(s.count).toBe(4);
    expect(s.withEmail).toBe(3);
    expect(s.sentence).toBe('Found 4 people, 3 with an email.');
  });

  it('hands back real names so the host recognises their own list', () => {
    expect(sum(PASTED).sample).toEqual(['Emma Doyle', 'James Reyes', 'Sam Okafor']);
  });

  it('never claims more people than the parser found', () => {
    const s = sum(PASTED);
    expect(s.count).toBe(parseGuestList(PASTED).guests.length);
  });
});

describe('says nothing when there is nothing to say', () => {
  it('is silent on an empty paste — the host has done nothing wrong', () => {
    expect(sum('').sentence).toBe('');
    expect(sum('   \n  \n').sentence).toBe('');
  });
});

describe('the shapes that change what happens next', () => {
  it('names the singular case properly', () => {
    expect(sum('Aunt Prue').sentence).toBe('Found 1 person, none with an email yet.');
  });

  it('says so when every guest can actually be invited', () => {
    expect(sum('Emma <emma@x.com>\nJames <james@y.com>').sentence)
      .toBe('Found 2 people, all with an email.');
  });

  it('warns plainly when nothing could be read', () => {
    const s = summarizeGuestPaste({ guests: [], headerMap: {}, rejected: [{ rowIndex: 1, reason: 'x' }] });
    expect(s.count).toBe(0);
    expect(s.sentence).toMatch(/couldn’t read any names/i);
  });
});

describe('a real CSV still goes through the CSV parser', () => {
  const CSV = 'Name,Email\nEmma Doyle,emma@x.com\nJames Reyes,james@y.com';

  it('does not eat the header row as a guest', () => {
    const s = sum(CSV);
    expect(s.count).toBe(2);
    expect(s.sample).toEqual(['Emma Doyle', 'James Reyes']);
  });
});
