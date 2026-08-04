// ─────────────────────────────────────────────────────────────
// doorway/makeover — "paste the site you have, see it reimagined."
//
// A makeover shows a stranger THEIR OWN event, which makes it the
// easiest place in the product to accidentally lie. The tests here
// exist to keep it honest:
//
//   • NOTHING IS INVENTED. No placeholder venue, no fabricated
//     schedule, no stand-in couple. If we didn't read it, it isn't
//     in the manifest.
//   • The preview is marked never-published, so it can't be
//     mistaken for a real site or indexed.
//   • Too little input yields `tooThin`, so the caller asks for
//     details instead of showing a shell that flatters nobody.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildMakeoverManifest, carriedSentence, MAKEOVER_LOOKS } from './makeover';
import type { DoorwayPrefill } from './extract';

const FULL: DoorwayPrefill = {
  names: ['Emma', 'James'],
  eventDate: '2027-09-12',
  venueName: 'The Old Mill',
  location: 'Hudson, New York',
  occasion: 'wedding',
  scheduleHints: ['4:00 PM — Ceremony', '6:00 PM — Dinner'],
};

function m(result: ReturnType<typeof buildMakeoverManifest>) {
  return result.manifest as unknown as Record<string, unknown>;
}

describe('nothing is invented', () => {
  it('places only the facts that were read', () => {
    const res = buildMakeoverManifest({ prefill: { names: ['Emma', 'James'], occasion: 'wedding' } });
    const mf = m(res);
    expect(mf.names).toEqual(['Emma', 'James']);
    // No date, no venue, no schedule — none were read.
    expect(mf.logistics).toBeUndefined();
    expect(mf.events).toBeUndefined();
  });

  it('never fabricates a venue or a schedule to fill the page', () => {
    const res = buildMakeoverManifest({ prefill: { names: ['Emma', 'James'], eventDate: '2027-09-12' } });
    const serialized = JSON.stringify(m(res)).toLowerCase();
    // The classic placeholder shapes must be absent.
    expect(serialized).not.toMatch(/lorem|placeholder|your venue|tbd|coming soon|some venue/);
    expect(m(res).events).toBeUndefined();
  });

  it('carries a schedule ONLY when lines were genuinely read', () => {
    const withSchedule = buildMakeoverManifest({ prefill: FULL });
    expect((m(withSchedule).events as unknown[]).length).toBe(2);
    expect(withSchedule.carried).toContain('schedule');

    const without = buildMakeoverManifest({ prefill: { ...FULL, scheduleHints: [] } });
    expect(m(without).events).toBeUndefined();
    expect(without.carried).not.toContain('schedule');
  });

  it('caps a long schedule rather than dumping the page', () => {
    const many = Array.from({ length: 20 }, (_, i) => `${i + 1}:00 PM — Thing ${i}`);
    const res = buildMakeoverManifest({ prefill: { ...FULL, scheduleHints: many } });
    expect((m(res).events as unknown[]).length).toBe(6);
  });
});

describe('the preview can never be mistaken for a real site', () => {
  it('is marked preview and unpublished', () => {
    const mf = m(buildMakeoverManifest({ prefill: FULL }));
    expect(mf.preview).toBe(true);
    expect(mf.published).toBe(false);
  });
});

describe('tooThin — ask, do not show a shell', () => {
  it('flags a prefill with nothing usable', () => {
    expect(buildMakeoverManifest({ prefill: {} }).tooThin).toBe(true);
  });

  it('flags names alone — a name on an empty page flatters nobody', () => {
    expect(buildMakeoverManifest({ prefill: { names: ['Emma', 'James'] } }).tooThin).toBe(true);
  });

  it('clears once there is a name and one more real fact', () => {
    expect(
      buildMakeoverManifest({ prefill: { names: ['Emma', 'James'], eventDate: '2027-09-12' } }).tooThin,
    ).toBe(false);
    expect(buildMakeoverManifest({ prefill: FULL }).tooThin).toBe(false);
  });
});

describe('the look pipeline is the real one', () => {
  it('applies the chosen theme', () => {
    for (const look of MAKEOVER_LOOKS) {
      const mf = m(buildMakeoverManifest({ prefill: FULL, lookId: look.id }));
      expect(mf.themeId, look.id).toBe(look.themeId);
    }
  });

  it('falls back to the first look for an unknown id', () => {
    const mf = m(buildMakeoverManifest({ prefill: FULL, lookId: 'not-a-look' }));
    expect(mf.themeId).toBe(MAKEOVER_LOOKS[0].themeId);
  });

  it('resolves an edition from the occasion, like the wizard does', () => {
    expect(m(buildMakeoverManifest({ prefill: FULL })).edition).toBeTruthy();
    // A memorial must not land on a celebratory edition.
    const memorial = m(buildMakeoverManifest({
      prefill: { names: ['Robert', ''], eventDate: '2027-01-04', occasion: 'memorial' },
    }));
    expect(memorial.edition).toBe('quiet');
  });

  it('joins couple names with an ampersand and others with a comma', () => {
    expect(m(buildMakeoverManifest({ prefill: FULL })).seoTitle).toBe('Emma & James');
    const reunion = m(buildMakeoverManifest({
      prefill: { names: ['The Okafors', 'Friends'], eventDate: '2027-06-01', occasion: 'reunion' },
    }));
    expect(reunion.seoTitle).toBe('The Okafors, Friends');
  });
});

describe('carriedSentence — plain language, no jargon', () => {
  it('names what came across', () => {
    expect(carriedSentence(['names'])).toBe('We brought over your names.');
    expect(carriedSentence(['names', 'date'])).toBe('We brought over your names and your date.');
    expect(carriedSentence(['names', 'date', 'venue']))
      .toBe('We brought over your names, your date and your venue.');
  });

  it('says so plainly when nothing came across', () => {
    expect(carriedSentence([])).toMatch(/couldn’t read/i);
  });

  it('uses no product jargon a first-time host would decode', () => {
    const s = carriedSentence(['names', 'date', 'venue', 'schedule']);
    expect(s).not.toMatch(/manifest|prefill|extract|payload|field/i);
  });
});
