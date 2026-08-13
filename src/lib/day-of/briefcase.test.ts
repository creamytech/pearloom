// ─────────────────────────────────────────────────────────────
// day-of/briefcase — the sheet for the guest who won't use a phone.
//
// This paper leaves the host's hands and goes into someone's coat
// pocket, which makes it a small privacy surface with real stakes.
// The tests below defend that, plus the honesty rule that an empty
// heading is worse than no heading — a blank "Getting there" reads
// as information that was lost.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildBriefcase, renderBriefcaseHtml, escapeHtml } from './briefcase';

const FULL = {
  eventTitle: 'Emma & James',
  dateLine: 'Saturday, 12 September 2027',
  venueName: 'The Old Mill',
  venueAddress: '14 Mill Lane, Hudson, New York 12534',
  dressCode: 'Garden formal — the lawn is soft, avoid stilettos.',
  gettingThere: 'Parking is behind the barn; the drive is gravel.',
  dayOfContactName: 'Priya (day-of)',
  dayOfContactPhone: '555-0101',
  schedule: [
    { name: 'Ceremony', time: '4:00 PM', place: 'The lawn' },
    { name: 'Dinner', time: '6:00 PM', place: null },
  ],
  guest: {
    name: 'Aunt Prue Okafor',
    tableName: 'Table 4',
    tableMates: ['Mary Beth Doyle', 'Samuel Reyes'],
    dietary: 'No shellfish',
  },
};

function headings(sheet: ReturnType<typeof buildBriefcase>) {
  return sheet.sections.map((s) => s.heading);
}

describe('privacy — this paper goes into someone else’s pocket', () => {
  it('reduces table-mates to FIRST names only', () => {
    const sheet = buildBriefcase(FULL);
    const seat = sheet.sections.find((s) => s.heading === 'Your seat')!;
    const text = seat.lines.join(' ');
    expect(text).toContain('Mary');
    expect(text).toContain('Samuel');
    // Surnames must never appear — this is a seating aid, not a roster.
    expect(text).not.toContain('Doyle');
    expect(text).not.toContain('Reyes');
  });

  it('caps the table-mate list rather than printing a whole room', () => {
    const many = Array.from({ length: 40 }, (_, i) => `Person${i} Surname`);
    const sheet = buildBriefcase({ ...FULL, guest: { ...FULL.guest, tableMates: many } });
    const line = sheet.sections.find((s) => s.heading === 'Your seat')!.lines.join(' ');
    expect(line.split(',').length).toBeLessThanOrEqual(13);
  });

  it('carries no email addresses anywhere on the sheet', () => {
    const serialized = JSON.stringify(buildBriefcase(FULL));
    expect(serialized).not.toMatch(/@/);
  });

  it('carries only THIS guest’s dietary note', () => {
    const sheet = buildBriefcase(FULL);
    const seat = sheet.sections.find((s) => s.heading === 'Your seat')!;
    expect(seat.lines.join(' ')).toContain('No shellfish');
  });
});

describe('an empty heading is worse than no heading', () => {
  it('omits sections with nothing in them', () => {
    const sparse = buildBriefcase({
      eventTitle: 'Emma & James',
      dateLine: 'Saturday, 12 September 2027',
      venueAddress: '14 Mill Lane',
      dayOfContactPhone: '555-0101',
      guest: { name: 'Aunt Prue' },
    });
    const h = headings(sparse);
    expect(h).toContain('Where and when');
    expect(h).toContain('If you need anything');
    // Nothing was given for these — they must not appear as blanks.
    expect(h).not.toContain('Getting there');
    expect(h).not.toContain('The day, in order');
    expect(h).not.toContain('Your seat');
    expect(h).not.toContain('What to wear');
  });

  it('includes every section when the host has filled everything in', () => {
    expect(headings(buildBriefcase(FULL))).toEqual([
      'Where and when',
      'Getting there',
      'The day, in order',
      'Your seat',
      'What to wear',
      'If you need anything',
    ]);
  });

  it('ignores blank-ish values rather than printing empty lines', () => {
    const sheet = buildBriefcase({
      ...FULL,
      gettingThere: '   ',
      dressCode: '',
      guest: { ...FULL.guest, tableName: '  ', tableMates: ['  ', ''] },
    });
    const h = headings(sheet);
    expect(h).not.toContain('Getting there');
    expect(h).not.toContain('What to wear');
    // Seat survives only because the dietary note remains.
    expect(sheet.sections.find((s) => s.heading === 'Your seat')!.lines)
      .toEqual(['Your note to the kitchen: No shellfish']);
  });
});

describe('missing — the HOST finds out, not the guest', () => {
  it('flags an absent address and day-of number', () => {
    const sheet = buildBriefcase({
      eventTitle: 'Emma & James',
      dateLine: 'Saturday',
      guest: { name: 'Aunt Prue' },
    });
    expect(sheet.missing).toContain('the full address');
    expect(sheet.missing).toContain('a day-of phone number');
  });

  it('is empty when everything essential is present', () => {
    expect(buildBriefcase(FULL).missing).toEqual([]);
  });
});

describe('the sheet itself', () => {
  it('addresses the guest by name', () => {
    expect(buildBriefcase(FULL).subtitle).toBe('For Aunt Prue Okafor');
  });

  it('degrades to a usable sheet with no guest name', () => {
    const sheet = buildBriefcase({ ...FULL, guest: { name: '' } });
    expect(sheet.subtitle).toBeNull();
    expect(sheet.title).toBe('Emma & James');
  });

  it('joins schedule lines readably, skipping absent parts', () => {
    const lines = buildBriefcase(FULL).sections
      .find((s) => s.heading === 'The day, in order')!.lines;
    expect(lines[0]).toBe('4:00 PM · Ceremony · The lawn');
    expect(lines[1]).toBe('6:00 PM · Dinner');
  });
});

describe('renderBriefcaseHtml — print-first and injection-safe', () => {
  it('escapes host-authored free text', () => {
    const html = renderBriefcaseHtml(buildBriefcase({
      ...FULL,
      eventTitle: '<script>alert(1)</script>',
      guest: { ...FULL.guest, name: 'A & B "quoted"' },
    }));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });

  it('sets a print page size and a large base type', () => {
    const html = renderBriefcaseHtml(buildBriefcase(FULL));
    expect(html).toContain('@page');
    // Large by design: read without a device to zoom.
    expect(html).toMatch(/font-size:\s*13pt/);
  });

  it('hides the print hint when actually printing', () => {
    expect(renderBriefcaseHtml(buildBriefcase(FULL)))
      .toMatch(/@media print \{ \.print-hint \{ display: none/);
  });

  it('escapeHtml handles the dangerous characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
});
