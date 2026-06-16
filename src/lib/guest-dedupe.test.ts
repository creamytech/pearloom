import { describe, it, expect } from 'vitest';
import {
  normalizeName,
  normalizeEmail,
  levenshtein,
  namesAreNear,
  findDuplicateGroups,
} from './guest-dedupe';

describe('normalizeName', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalizeName('  John   Smith ')).toBe('john smith');
  });
  it('treats punctuation and hyphens as separators', () => {
    expect(normalizeName('Jean-Luc')).toBe(normalizeName('Jean Luc'));
    expect(normalizeName("O'Brien")).toBe('obrien');
  });
  it('strips accents', () => {
    expect(normalizeName('Renée')).toBe('renee');
  });
});

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Anna@X.com ')).toBe('anna@x.com');
  });
  it('treats the dashboard placeholder and empty as no email', () => {
    expect(normalizeEmail('—')).toBe('');
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
  });
});

describe('levenshtein', () => {
  it('is 0 for equal strings', () => {
    expect(levenshtein('john', 'john')).toBe(0);
  });
  it('counts single edits', () => {
    expect(levenshtein('jon', 'john')).toBe(1); // insertion
    expect(levenshtein('smyth', 'smith')).toBe(1); // substitution
  });
});

describe('namesAreNear', () => {
  it('matches one-letter typos on normal-length names', () => {
    expect(namesAreNear('john smith', 'jon smith')).toBe(true);
    expect(namesAreNear('smith', 'smyth')).toBe(true);
  });
  it('requires exact match for very short names', () => {
    expect(namesAreNear('ann', 'dan')).toBe(false);
    expect(namesAreNear('ann', 'ann')).toBe(true);
  });
  it('does not collapse genuinely different names', () => {
    expect(namesAreNear('alice johnson', 'bob williams')).toBe(false);
  });
  it('is false when either side is empty', () => {
    expect(namesAreNear('', 'john')).toBe(false);
  });
});

describe('findDuplicateGroups', () => {
  it('returns nothing for a unique list', () => {
    expect(
      findDuplicateGroups([
        { id: '1', name: 'Alice Johnson', email: 'alice@x.com' },
        { id: '2', name: 'Bob Williams', email: 'bob@x.com' },
      ]),
    ).toEqual([]);
  });

  it('groups guests sharing an email even with different names', () => {
    const groups = findDuplicateGroups([
      { id: '1', name: 'Anna B', email: 'anna@x.com' },
      { id: '2', name: 'Annabelle', email: 'anna@x.com' },
      { id: '3', name: 'Carl', email: 'carl@x.com' },
    ]);
    expect(groups).toEqual([['1', '2']]);
  });

  it('groups near-spelling names without emails', () => {
    const groups = findDuplicateGroups([
      { id: '1', name: 'Jon Smith', email: null },
      { id: '2', name: 'John Smith', email: '' },
      { id: '3', name: 'Maria Garcia' },
    ]);
    expect(groups).toEqual([['1', '2']]);
  });

  it('transitively merges a chain into one group', () => {
    const groups = findDuplicateGroups([
      { id: 'a', name: 'Catherine Lee', email: 'cat@x.com' },
      { id: 'b', name: 'Katherine Lee', email: 'cat@x.com' },
      { id: 'c', name: 'Katherine Lee', email: 'kate@x.com' },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].sort()).toEqual(['a', 'b', 'c']);
  });

  it('orders larger groups first', () => {
    const groups = findDuplicateGroups([
      { id: '1', name: 'Sam Park', email: 'sam@x.com' },
      { id: '2', name: 'Sam Park', email: 'sam@x.com' },
      { id: '3', name: 'Sam Park', email: 'sam@x.com' },
      { id: '4', name: 'Dana Cole', email: 'dana@x.com' },
      { id: '5', name: 'Dana Cole', email: 'dana@x.com' },
    ]);
    expect(groups[0]).toHaveLength(3);
    expect(groups[1]).toHaveLength(2);
  });
});
