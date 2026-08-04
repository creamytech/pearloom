// ─────────────────────────────────────────────────────────────
// planner/reusable-structure — shape carries, content never does.
//
// The failure this file exists to prevent is catastrophic AND
// quiet: a planner reuses last wedding's shape for the next client
// and ships Emma & James's story, venue, photographs or guest list
// to a different couple — on a site that looks like it's working.
//
// So the transform is an ALLOWLIST and these tests attack it from
// the leak side: every content-shaped field must be absent, and a
// field invented tomorrow must be excluded by DEFAULT rather than
// leaking on its first day.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  extractReusableStructure,
  applyReusableStructure,
  structureSummary,
  STRUCTURAL_KEYS,
} from './reusable-structure';

/** A finished client site, with plenty that must NOT travel. */
const FINISHED = {
  // Structure + look — these should carry.
  blockOrder: ['hero', 'story', 'schedule', 'rsvp'],
  hiddenSections: ['registry'],
  blockVariants: { hero: 'postcard' },
  themeId: 'garden',
  themeVars: { '--t-accent': '#6B7A4F' },
  kitId: 'plate',
  texture: 'linen',
  density: 'comfortable',
  edition: 'almanac',
  occasion: 'wedding',

  // CONTENT — none of this may travel.
  names: ['Emma', 'James'],
  seoTitle: 'Emma & James',
  logistics: { date: '2027-09-12', venue: 'The Old Mill', venueAddress: '14 Mill Lane' },
  chapters: [{ id: 'c1', title: 'How we met', description: 'At a bus stop…' }],
  faqs: [{ id: 'f1', question: 'Parking?', answer: 'Behind the barn.' }],
  events: [{ id: 'e1', name: 'Ceremony' }],
  galleryImages: ['https://r2/emma-1.jpg'],
  coverPhoto: 'https://r2/cover.jpg',
  registry: { items: [{ name: 'Toaster' }] },
  guests: [{ name: 'Aunt Prue', email: 'prue@x.test' }],
  poetry: { heroTagline: 'Two people, one bus stop.' },
  celebration: { id: 'celeb-1', name: 'Emma & James, all weekend' },
  voiceDNA: { sample: 'Emma writes like this…' },
};

describe('content NEVER travels', () => {
  const s = extractReusableStructure(FINISHED, 'My wedding shape');
  const serialized = JSON.stringify(s.manifest);

  it('carries no names, anywhere', () => {
    expect(serialized).not.toMatch(/Emma|James|Prue/);
  });

  it('carries no venue, address or date', () => {
    expect(serialized).not.toMatch(/Old Mill|Mill Lane|2027-09-12/);
  });

  it('carries no written words — story, FAQ, poetry', () => {
    expect(serialized).not.toMatch(/bus stop|Behind the barn|Toaster/i);
  });

  it('carries no photographs', () => {
    expect(serialized).not.toMatch(/r2\/|\.jpg/);
  });

  it('carries no guests and no email addresses', () => {
    expect(serialized).not.toMatch(/@/);
    expect(s.manifest).not.toHaveProperty('guests');
  });

  it('carries no celebration link — a template is not tied to an arc', () => {
    expect(s.manifest).not.toHaveProperty('celebration');
  });

  it('carries no voice profile — that is the client’s own register', () => {
    expect(s.manifest).not.toHaveProperty('voiceDNA');
  });
});

describe('shape DOES travel', () => {
  const s = extractReusableStructure(FINISHED, 'My wedding shape');

  it('carries the section order and hidden set', () => {
    const m = s.manifest as Record<string, unknown>;
    expect(m.blockOrder).toEqual(['hero', 'story', 'schedule', 'rsvp']);
    // `hiddenSections` is a loose manifest field (wizard-sections
    // writes it untyped) — assert through the record view.
    expect(m.hiddenSections).toEqual(['registry']);
  });

  it('carries the look', () => {
    const m = s.manifest as Record<string, unknown>;
    expect(m.themeId).toBe('garden');
    expect(m.kitId).toBe('plate');
    expect(m.texture).toBe('linen');
    expect(m.edition).toBe('almanac');
  });

  it('reports what it dropped, so the planner is never surprised', () => {
    expect(s.dropped).toContain('names');
    expect(s.dropped).toContain('logistics');
    expect(s.dropped).toContain('galleryImages');
  });
});

describe('the allowlist is the point', () => {
  it('drops a field invented tomorrow, by DEFAULT', () => {
    const withFuture = { ...FINISHED, someFieldAddedNextYear: { guest: 'secret' } };
    const s = extractReusableStructure(withFuture, 'shape');
    expect(s.manifest).not.toHaveProperty('someFieldAddedNextYear');
    expect(s.dropped).toContain('someFieldAddedNextYear');
    expect(JSON.stringify(s.manifest)).not.toMatch(/secret/);
  });

  it('every allowlisted key is structural, not content', () => {
    // A guard on the list itself: no key that names content may be
    // added here without this failing.
    for (const key of STRUCTURAL_KEYS) {
      expect(key, `"${key}" looks like content`).not.toMatch(
        /name|story|chapter|faq|guest|photo|gallery|registry|poetry|logistic|voice|celebration|event/i,
      );
    }
  });

  it('handles junk input without throwing', () => {
    for (const bad of [null, undefined, 'a string', 42, []]) {
      const s = extractReusableStructure(bad as never, 'x');
      expect(s.manifest).toEqual({});
    }
  });

  it('gives an untitled shape a usable name', () => {
    expect(extractReusableStructure(FINISHED, '   ').name).toBe('Untitled shape');
  });
});

describe('applyReusableStructure — additive, never destructive', () => {
  const shape = extractReusableStructure(FINISHED, 'shape');

  it('fills a blank new site', () => {
    const out = applyReusableStructure({}, shape) as unknown as Record<string, unknown>;
    expect(out.themeId).toBe('garden');
    expect(out.blockOrder).toEqual(['hero', 'story', 'schedule', 'rsvp']);
  });

  it('NEVER clobbers a choice the new host already made', () => {
    const inProgress = { themeId: 'midnight', names: ['Ana', 'Luis'] };
    const out = applyReusableStructure(inProgress, shape) as unknown as Record<string, unknown>;
    expect(out.themeId).toBe('midnight');        // their pick survives
    expect(out.names).toEqual(['Ana', 'Luis']);  // their content survives
    expect(out.kitId).toBe('plate');             // the blank is filled
  });

  it('cannot smuggle content even if a structure object is tampered with', () => {
    const tampered = {
      name: 'evil',
      manifest: { themeId: 'garden', names: ['Leaked', 'Names'] } as never,
      dropped: [],
    };
    const out = applyReusableStructure({}, tampered) as unknown as Record<string, unknown>;
    expect(out.themeId).toBe('garden');
    expect(out).not.toHaveProperty('names');
  });

  it('is safe with a missing structure', () => {
    expect(applyReusableStructure({ themeId: 'x' }, null)).toEqual({ themeId: 'x' });
  });
});

describe('structureSummary — says what does not carry', () => {
  it('names the pieces and the exclusion in plain words', () => {
    const s = structureSummary(extractReusableStructure(FINISHED, 'shape'));
    expect(s).toMatch(/4 sections in order/);
    expect(s).toMatch(/No names, words, photos or guests/i);
  });

  it('is honest about an empty shape', () => {
    expect(structureSummary(extractReusableStructure({}, 'empty')))
      .toMatch(/nothing to carry/i);
  });
});
