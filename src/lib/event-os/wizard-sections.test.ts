// wizard-sections — the shared section catalog + finish wiring.
//
// The chooser set is DERIVED from EVENT_TYPES via SECTION_GATE (never
// a hand-kept 28-list), so these tests cross-check the derivation
// against WIZARD-SECTIONS-PLAN.md §2.2's authoritative table and pin
// the canonical order, layout defaults, legacy-block exclusion, and
// the mergeBlockOrder / applySectionPicks finish wiring.

import { describe, it, expect } from 'vitest';
import type { StoryManifest } from '@/types';
import {
  SECTION_GATE,
  SECTION_ORDER,
  CORE_BLOCK_ORDER,
  SECTION_META,
  CORE_SECTION_META,
  OPTIONAL_SECTION_META,
  wizardSectionsFor,
  essentialSectionsFor,
  mergeBlockOrder,
  applySectionPicks,
} from './wizard-sections';
import { EVENT_TYPES, getAllOccasionIds, getEventType } from './event-types';
import { LAYOUTS, DEFAULT_VARIANT } from '@/components/pearloom/redesign/layouts';

// ThemedSite.allKinds minus hero — the sections that can live in
// blockOrder. SECTION_ORDER must cover exactly this set.
const ALL_KINDS_NO_HERO = [
  'story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'rsvp', 'faq',
  'countdown', 'map', 'music',
  'itinerary', 'costSplitter', 'activityVote', 'toastSignup', 'adviceWall',
  'program', 'livestream', 'obituary', 'packingList', 'honorList',
  'tributeWall', 'menu', 'dressCode', 'nameVote', 'rooms', 'thenAndNow',
  'groupChat',
];

// Legacy EVENT_TYPES blocks with NO redesign canvas section — can
// never be chooser cards (§2.2 GAPs / §5 risk 7).
const LEGACY_NO_SECTION = [
  'guestbook', 'anniversary', 'quote', 'hashtag', 'storymap',
  'quiz', 'welcome', 'vibeQuote', 'photoWall',
];

const essentialsOf = (occasion: string) =>
  wizardSectionsFor(occasion).filter((o) => o.group === 'essential').map((o) => o.section).sort();

describe('SECTION_ORDER + CORE_BLOCK_ORDER', () => {
  it('covers exactly ThemedSite.allKinds minus hero, no dupes, no hero', () => {
    expect(SECTION_ORDER).not.toContain('hero');
    expect(new Set(SECTION_ORDER).size).toBe(SECTION_ORDER.length);
    expect([...SECTION_ORDER].sort()).toEqual([...ALL_KINDS_NO_HERO].sort());
  });

  it('CORE_BLOCK_ORDER equals the legacy 8-item core order exactly', () => {
    // The list wizard-seed + bastings hardcoded before the shared source.
    expect(CORE_BLOCK_ORDER).toEqual([
      'story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'rsvp', 'faq',
    ]);
  });
});

describe('SECTION_GATE / SECTION_META consistency', () => {
  it('SECTION_META has an entry for every gated section (and vice versa)', () => {
    expect(Object.keys(SECTION_META).sort()).toEqual(Object.keys(SECTION_GATE).sort());
  });

  it('CORE + OPTIONAL meta partition SECTION_META with no overlap', () => {
    const core = CORE_SECTION_META.map((m) => m.id);
    const opt = OPTIONAL_SECTION_META.map((m) => m.id);
    expect(core.filter((c) => opt.includes(c))).toEqual([]);
    expect([...core, ...opt].sort()).toEqual(Object.keys(SECTION_META).sort());
  });

  it('never gates the legacy no-canvas blocks', () => {
    for (const legacy of LEGACY_NO_SECTION) {
      expect(SECTION_GATE[legacy]).toBeUndefined();
    }
  });
});

describe('wizardSectionsFor — derivation matches §2.2 for the named occasions', () => {
  // Full essentials (INCLUDING the always-on hero/details/schedule/
  // gallery the §2.2 table omits for brevity).
  it('wedding', () => {
    expect(essentialsOf('wedding')).toEqual([
      'countdown', 'details', 'faq', 'gallery', 'hero', 'honorList',
      'map', 'registry', 'rsvp', 'schedule', 'story', 'travel',
    ].sort());
  });

  it('memorial (countdown hidden, obituary/program/tributeWall/livestream in)', () => {
    expect(essentialsOf('memorial')).toEqual([
      'details', 'faq', 'gallery', 'hero', 'livestream', 'map',
      'obituary', 'program', 'schedule', 'story', 'tributeWall',
    ].sort());
    // countdown is hidden for memorial → never offered at all.
    expect(wizardSectionsFor('memorial').map((o) => o.section)).not.toContain('countdown');
  });

  it('baby-shower', () => {
    expect(essentialsOf('baby-shower')).toEqual([
      'adviceWall', 'countdown', 'details', 'dressCode', 'faq', 'gallery',
      'hero', 'map', 'menu', 'nameVote', 'registry', 'rsvp', 'schedule',
    ].sort());
  });

  it('reunion (honorList serves whosWho)', () => {
    expect(essentialsOf('reunion')).toEqual([
      'details', 'faq', 'gallery', 'hero', 'honorList', 'itinerary',
      'map', 'rooms', 'rsvp', 'schedule', 'thenAndNow',
    ].sort());
  });
});

describe('wizardSectionsFor — the derivation rule holds for all 28 occasions', () => {
  const OCCASIONS = getAllOccasionIds();

  it('covers every shipped occasion', () => {
    expect(OCCASIONS.length).toBe(EVENT_TYPES.length);
  });

  for (const occ of OCCASIONS) {
    it(`${occ}: essentials/optionals partition per default/optional blocks; hidden excluded`, () => {
      const event = getEventType(occ)!;
      const offers = wizardSectionsFor(occ);
      const bySection = new Map<string, (typeof offers)[number]>(offers.map((o) => [o.section, o]));

      for (const [section, gate] of Object.entries(SECTION_GATE)) {
        const offer = bySection.get(section);
        if (gate === null) {
          // Always essential.
          expect(offer?.group).toBe('essential');
          continue;
        }
        const inDefault = gate.some((g) => (event.defaultBlocks as readonly string[]).includes(g));
        const inOptional = gate.some((g) => (event.optionalBlocks as readonly string[]).includes(g));
        if (inDefault) {
          expect(offer?.group).toBe('essential');
        } else if (inOptional) {
          expect(offer?.group).toBe('optional');
        } else {
          // hidden / unlisted — never offered.
          expect(offer).toBeUndefined();
        }
      }

      // Never surface a legacy no-canvas block.
      for (const legacy of LEGACY_NO_SECTION) {
        expect(bySection.has(legacy)).toBe(false);
      }

      // Every offered variant is a real LAYOUTS entry for its section.
      for (const o of offers) {
        const ids = (LAYOUTS[o.section] ?? []).map((v) => v.id);
        expect(ids).toContain(o.variant);
        if (o.recommended) expect(ids).toContain(o.recommended);
      }
    });
  }
});

describe('wizardSectionsFor — canonical order + layout defaults', () => {
  it('returns offers in hero-first canonical SECTION_ORDER', () => {
    const offers = wizardSectionsFor('wedding').map((o) => o.section);
    expect(offers[0]).toBe('hero');
    // The non-hero offers appear in SECTION_ORDER-relative order.
    const rest = offers.slice(1);
    const canonicalIdx = rest.map((s) => SECTION_ORDER.indexOf(s));
    expect(canonicalIdx).toEqual([...canonicalIdx].sort((a, b) => a - b));
  });

  it('applies the §2.4 recommended variant as the default where one exists', () => {
    const heroMemorial = wizardSectionsFor('memorial').find((o) => o.section === 'hero');
    expect(heroMemorial?.variant).toBe('crest');
    expect(heroMemorial?.recommended).toBe('crest');

    const galleryWedding = wizardSectionsFor('wedding').find((o) => o.section === 'gallery');
    expect(galleryWedding?.variant).toBe('frames');

    const nameVoteReveal = wizardSectionsFor('gender-reveal').find((o) => o.section === 'nameVote');
    expect(nameVoteReveal?.variant).toBe('tiles');
  });

  it('falls back to DEFAULT_VARIANT where no recommendation exists', () => {
    // Wedding hero has no recommendation → the plain default.
    const heroWedding = wizardSectionsFor('wedding').find((o) => o.section === 'hero');
    expect(heroWedding?.variant).toBe(DEFAULT_VARIANT.hero);
    expect(heroWedding?.recommended).toBeUndefined();
    // Schedule is never in VARIANT_RECOMMENDATIONS.
    const sched = wizardSectionsFor('wedding').find((o) => o.section === 'schedule');
    expect(sched?.variant).toBe(DEFAULT_VARIANT.schedule);
  });

  it('unknown occasion → only the always-on essentials (never strands)', () => {
    const offers = wizardSectionsFor('not-a-real-occasion');
    expect(offers.map((o) => o.section)).toEqual(['hero', 'details']);
    expect(offers.every((o) => o.group === 'essential')).toBe(true);
  });
});

describe('essentialSectionsFor', () => {
  it('is the essential subset of wizardSectionsFor', () => {
    const ess = essentialSectionsFor('wedding');
    expect(ess).toContain('hero');
    expect(ess).toContain('registry');
    expect(ess).not.toContain('music'); // wedding: spotify is optional
  });
});

describe('mergeBlockOrder — content-wins union + canonical resort', () => {
  it('re-sorts the union by SECTION_ORDER', () => {
    expect(mergeBlockOrder(undefined, ['faq', 'story', 'rsvp'])).toEqual(['story', 'rsvp', 'faq']);
  });

  it('keeps seeded sections not in the selection (content wins)', () => {
    // seed appended music; the host never ticked it — it must survive.
    const out = mergeBlockOrder(['music'], ['story', 'faq']);
    expect(out).toContain('music');
    expect(out).toEqual(['story', 'music', 'faq']);
  });

  it('dedupes and drops hero / non-section junk', () => {
    expect(mergeBlockOrder(['hero', 'footer', 'story'], ['story', 'story']))
      .toEqual(['story']);
  });
});

// ── applySectionPicks ────────────────────────────────────────

const wedding = (extra: Record<string, unknown> = {}): StoryManifest =>
  ({ occasion: 'wedding', ...extra } as unknown as StoryManifest);
const loose = (m: StoryManifest) => m as unknown as Record<string, unknown>;

describe('applySectionPicks — finish assembly (§3.3)', () => {
  it('writes an explicit blockOrder from the on-set, in canonical order', () => {
    const out = loose(applySectionPicks(
      wedding(),
      'wedding',
      { on: ['story', 'rsvp', 'faq', 'hero'], layouts: {} },
    ));
    // hero excluded (pinned by the renderer).
    expect(out.blockOrder).toEqual(['story', 'rsvp', 'faq']);
  });

  it('deselecting an essential with NO content → hiddenSections', () => {
    const on = essentialSectionsFor('wedding').filter((s) => s !== 'registry');
    const out = loose(applySectionPicks(wedding(), 'wedding', { on, layouts: {} }));
    expect(out.hiddenSections as string[]).toContain('registry');
    expect(out.blockOrder as string[]).not.toContain('registry');
  });

  it('deselecting an essential WITH content → stays (content wins, never hidden)', () => {
    const on = essentialSectionsFor('wedding').filter((s) => s !== 'travel');
    const m = wedding({ travelInfo: { hotels: [{ id: 'h1', name: 'The Drake', address: '' }] } });
    const out = loose(applySectionPicks(m, 'wedding', { on, layouts: {} }));
    expect((out.hiddenSections as string[] | undefined) ?? []).not.toContain('travel');
  });

  it('unions seed-appended content sections into blockOrder', () => {
    // seedSectionsFromWizard already appended music (host added a
    // playlist) — even though the chooser on-set omits it, it survives.
    const m = wedding({ blockOrder: [...CORE_BLOCK_ORDER, 'music'] });
    const out = loose(applySectionPicks(
      m,
      'wedding',
      { on: ['story', 'faq'], layouts: {} },
    ));
    expect(out.blockOrder as string[]).toContain('music');
  });

  it('ticking an optional section adds it to blockOrder', () => {
    const out = loose(applySectionPicks(
      wedding(),
      'wedding',
      { on: ['story', 'music'], layouts: {} }, // music optional for wedding
    ));
    expect(out.blockOrder as string[]).toContain('music');
  });

  it('layout picks land in manifest.layouts (merged over existing)', () => {
    const m = wedding({ layouts: { story: 'timeline' } });
    const out = loose(applySectionPicks(
      m,
      'wedding',
      { on: ['story'], layouts: { hero: 'crest', gallery: 'frames' } },
    ));
    const layouts = out.layouts as Record<string, string>;
    expect(layouts.hero).toBe('crest');
    expect(layouts.gallery).toBe('frames');
    expect(layouts.story).toBe('timeline'); // untouched existing entry
  });

  it('empty layout picks never touch manifest.layouts (Wave-1 silent seed)', () => {
    const m = wedding({ layouts: { story: 'timeline', schedule: 'timeline' } });
    const out = loose(applySectionPicks(
      m,
      'wedding',
      { on: essentialSectionsFor('wedding'), layouts: {} },
    ));
    expect(out.layouts).toEqual({ story: 'timeline', schedule: 'timeline' });
  });

  it('all-essentials-on writes no hiddenSections (the Wave-1 safe landing)', () => {
    const out = loose(applySectionPicks(
      wedding(),
      'wedding',
      { on: essentialSectionsFor('wedding'), layouts: {} },
    ));
    expect(out.hiddenSections).toBeUndefined();
  });

  it('is pure — does not mutate the input manifest', () => {
    const m = wedding();
    applySectionPicks(m, 'wedding', { on: ['story'], layouts: { hero: 'crest' } });
    expect((m as unknown as Record<string, unknown>).blockOrder).toBeUndefined();
    expect((m as unknown as Record<string, unknown>).layouts).toBeUndefined();
  });
});
