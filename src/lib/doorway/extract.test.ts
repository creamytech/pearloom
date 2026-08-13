// ─────────────────────────────────────────────────────────────
// doorway/extract — "give us what you already have."
//
// The property that matters most here is RESTRAINT. This parser
// feeds a preview the host is about to see with their own names
// and date on it, so a confident wrong answer is worse than a
// blank field:
//
//   • An ambiguous numeric date (03/04/2027) must be SKIPPED, not
//     guessed — it's March 4 in the US and April 3 elsewhere.
//   • A copyright year must not become an event date.
//   • A venue name must not become a person's name.
//   • A model suggestion must never overwrite a parsed fact.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  extractDate,
  extractNames,
  extractOccasion,
  extractScheduleHints,
  extractDeterministic,
  mergeModelSuggestions,
  htmlToText,
  htmlTitle,
} from './extract';

const NOW = 2026;

describe('extractDate — confident or nothing', () => {
  it('reads unambiguous written dates in both orders', () => {
    expect(extractDate('Join us September 12, 2027', NOW)).toBe('2027-09-12');
    expect(extractDate('Join us 12 September 2027', NOW)).toBe('2027-09-12');
    expect(extractDate('Sept 3rd, 2027', NOW)).toBe('2027-09-03');
    expect(extractDate('on 2027-09-12 we marry', NOW)).toBe('2027-09-12');
  });

  it('NEVER guesses an ambiguous numeric date', () => {
    // 03/04/2027 is March 4 (US) or April 3 (most of the world).
    expect(extractDate('Save the date: 03/04/2027', NOW)).toBeUndefined();
    expect(extractDate('11/12/2027', NOW)).toBeUndefined();
  });

  it('ignores implausible years (copyright lines, old archives)', () => {
    expect(extractDate('© 2019 Some Venue', NOW)).toBeUndefined();
    expect(extractDate('built in 1998', NOW)).toBeUndefined();
    expect(extractDate('June 1, 2099', NOW)).toBeUndefined();
  });

  it('accepts a date up to a year in the past (a just-passed event)', () => {
    expect(extractDate('June 1, 2025', NOW)).toBe('2025-06-01');
  });

  it('returns undefined for text with no date', () => {
    expect(extractDate('We are so excited!', NOW)).toBeUndefined();
  });
});

describe('extractNames — a couple, not a venue', () => {
  it('reads the common title shapes', () => {
    expect(extractNames('Emma & James')).toEqual(['Emma', 'James']);
    expect(extractNames('Emma and James')).toEqual(['Emma', 'James']);
    expect(extractNames('The Wedding of Emma & James')).toEqual(['Emma', 'James']);
    expect(extractNames('Emma & James — Our Wedding')).toEqual(['Emma', 'James']);
    expect(extractNames('Save the Date | Emma + James')).toEqual(['Emma', 'James']);
  });

  it('keeps two-word names intact', () => {
    expect(extractNames('Mary Beth & James')).toEqual(['Mary Beth', 'James']);
  });

  it('refuses things that are not two names', () => {
    expect(extractNames('Welcome to our wedding website')).toBeUndefined();
    // A venue whose halves both LOOK capitalized must not become a
    // couple — this is the failure that would address a host's own
    // preview to a hotel.
    expect(extractNames('The Grand Hotel and Spa Resort Collection')).toBeUndefined();
    expect(extractNames('Willow Barn and Garden Room')).toBeUndefined();
    expect(extractNames('The Smiths and The Joneses')).toBeUndefined();
    expect(extractNames('Emma')).toBeUndefined();
    expect(extractNames('')).toBeUndefined();
    // Digits are a strong signal it isn't a name.
    expect(extractNames('Suite 200 & Suite 300')).toBeUndefined();
  });
});

describe('extractOccasion — most specific wins', () => {
  it('does not let a stray "wedding" outrank the real occasion', () => {
    expect(extractOccasion("Emma's bachelorette — before the wedding!")).toBe('bachelorette-party');
    expect(extractOccasion('Bridal shower for the wedding of Emma')).toBe('bridal-shower');
  });

  it('recognizes solemn occasions', () => {
    expect(extractOccasion('A celebration of life for Robert')).toBe('memorial');
    expect(extractOccasion('In loving memory')).toBe('memorial');
  });

  it('falls back to wedding on the obvious signals', () => {
    expect(extractOccasion('Save the date! We are getting married')).toBe('wedding');
    expect(extractOccasion('nothing here')).toBeUndefined();
  });
});

describe('extractScheduleHints', () => {
  it('picks up run-of-show lines and dedupes', () => {
    const text = [
      'Our day',
      '4:00 PM — Ceremony',
      '5:00 pm Cocktails on the lawn',
      '4:00 PM — Ceremony',
      'not a time line',
    ].join('\n');
    const hints = extractScheduleHints(text);
    expect(hints).toHaveLength(2);
    expect(hints[0]).toMatch(/Ceremony/);
  });

  it('returns nothing when there is no schedule', () => {
    expect(extractScheduleHints('Just some prose about the venue.')).toEqual([]);
  });
});

describe('extractDeterministic — the whole pass', () => {
  it('fills what it can from a realistic page and flags what it filled', () => {
    const res = extractDeterministic({
      title: 'Emma & James — Our Wedding',
      text: '\nWe are getting married on September 12, 2027.\n4:00 PM — Ceremony\n6:00 PM — Dinner\n',
      nowYear: NOW,
    });
    expect(res.prefill.names).toEqual(['Emma', 'James']);
    expect(res.prefill.eventDate).toBe('2027-09-12');
    expect(res.prefill.occasion).toBe('wedding');
    expect(res.prefill.scheduleHints).toHaveLength(2);
    expect(res.empty).toBe(false);
    expect(res.filled).toContain('names');
    expect(res.filled).toContain('eventDate');
    // sourceTitle is context for the host, not an extracted fact.
    expect(res.filled).not.toContain('sourceTitle');
  });

  it('reports empty when nothing usable is present, so the caller can fall back', () => {
    const res = extractDeterministic({ text: 'hello there', nowYear: NOW });
    expect(res.empty).toBe(true);
    expect(res.filled).toEqual([]);
  });

  it('is not thrown off by an empty or missing input', () => {
    expect(extractDeterministic({ text: '', nowYear: NOW }).empty).toBe(true);
  });
});

describe('mergeModelSuggestions — a guess never beats a fact', () => {
  const base = extractDeterministic({
    title: 'Emma & James',
    text: 'September 12, 2027',
    nowYear: NOW,
  });

  it('fills only blanks', () => {
    const merged = mergeModelSuggestions(base, {
      names: ['Wrong', 'Guess'],
      eventDate: '2030-01-01',
      venueName: 'The Old Mill',
    });
    // Parsed facts survive…
    expect(merged.prefill.names).toEqual(['Emma', 'James']);
    expect(merged.prefill.eventDate).toBe('2027-09-12');
    // …and the blank is filled.
    expect(merged.prefill.venueName).toBe('The Old Mill');
  });

  it('rejects a malformed model date rather than storing it', () => {
    const empty = extractDeterministic({ text: 'no facts here', nowYear: NOW });
    expect(mergeModelSuggestions(empty, { eventDate: 'next summer' }).prefill.eventDate)
      .toBeUndefined();
    expect(mergeModelSuggestions(empty, { eventDate: '2027-09-12' }).prefill.eventDate)
      .toBe('2027-09-12');
  });

  it('rejects a malformed names pair', () => {
    const empty = extractDeterministic({ text: 'no facts here', nowYear: NOW });
    expect(mergeModelSuggestions(empty, { names: ['Solo'] as unknown as [string, string] }).prefill.names)
      .toBeUndefined();
  });

  it('ignores unknown keys a model might invent', () => {
    const merged = mergeModelSuggestions(base, { hackedField: 'x' } as never);
    expect((merged.prefill as Record<string, unknown>).hackedField).toBeUndefined();
  });

  it('is a no-op on null/undefined', () => {
    expect(mergeModelSuggestions(base, null)).toBe(base);
    expect(mergeModelSuggestions(base, undefined)).toBe(base);
  });
});

describe('htmlToText / htmlTitle', () => {
  it('strips scripts, styles and tags, and decodes entities', () => {
    const html = `
      <html><head><title>Emma &amp; James</title><style>.a{color:red}</style></head>
      <body><script>alert(1)</script><h1>Emma &amp; James</h1><p>Sept 12</p></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain('Emma & James');
    expect(text).toContain('Sept 12');
    expect(text).not.toContain('alert(1)');
    expect(text).not.toContain('color:red');
    expect(text).not.toContain('<');
  });

  it('prefers og:title, falling back to <title>', () => {
    expect(htmlTitle('<meta property="og:title" content="Emma &amp; James"><title>Other</title>'))
      .toBe('Emma &amp; James');
    expect(htmlTitle('<title>  Just This  </title>')).toBe('Just This');
    expect(htmlTitle('<p>no title</p>')).toBeUndefined();
  });
});
