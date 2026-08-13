// PERSONA-PLAN S1 — the wizard preview frame grammar matrix.
// Law 1: a solo occasion is not a degraded couple. Every registry
// occasion gets a frame whose verb line agrees with its name mode
// and whose vocabulary matches its voice.
import { describe, it, expect } from 'vitest';
import { EVENT_TYPES } from '@/lib/event-os/event-types';
import { nameModeFor } from '@/lib/event-os/name-mode';
import {
  previewFrameFor,
  orderPalettesForOccasion,
  defaultPaletteIdFor,
} from '@/lib/event-os/preview-frame';

const PALETTES = [
  { id: 'groovy-garden', name: 'Groovy Garden' },
  { id: 'dusk-meadow', name: 'Dusk Meadow' },
  { id: 'warm-linen', name: 'Warm Linen' },
  { id: 'olive-gold', name: 'Olive & Gold' },
];

describe('previewFrameFor — the full registry matrix', () => {
  it('every occasion resolves a complete frame', () => {
    for (const et of EVENT_TYPES) {
      const f = previewFrameFor(et.id);
      expect(f.eyebrow, et.id).toBeTruthy();
      expect(f.verbLine, et.id).toBeTruthy();
      expect(f.storyEyebrow, et.id).toBeTruthy();
      expect(f.storyTitle, et.id).toBeTruthy();
      expect(f.storyBlurb, et.id).toBeTruthy();
      expect(f.rsvpTitle, et.id).toBeTruthy();
      expect(f.rsvpCta, et.id).toBeTruthy();
    }
  });

  it('only couple occasions may conjugate plural ("are …")', () => {
    for (const et of EVENT_TYPES) {
      const mode = nameModeFor(et.id).mode;
      const f = previewFrameFor(et.id);
      if (mode !== 'couple') {
        // "‹single name› are celebrating" was the walkthrough bug.
        expect(f.verbLine, `${et.id} (${mode}): "${f.verbLine}"`).not.toMatch(/^are\b/);
      }
    }
  });

  it('group occasions never conjugate at all (subject may be one name or many)', () => {
    for (const et of EVENT_TYPES) {
      if (nameModeFor(et.id).mode !== 'group') continue;
      const f = previewFrameFor(et.id);
      expect(f.verbLine, `${et.id}: "${f.verbLine}"`).not.toMatch(/^(is|are)\b/);
    }
  });

  it('solemn occasions carry no party frame anywhere', () => {
    for (const id of ['memorial', 'funeral']) {
      const f = previewFrameFor(id);
      const all = Object.values(f).join(' · ').toLowerCase();
      expect(f.eyebrow).toBe('In loving memory');
      expect(f.storyTitle).toBe('A life remembered');
      expect(f.rsvpCta).toBe('Reply');
      expect(all).not.toContain('save the date');
      expect(all).not.toContain('celebrating');
      expect(all).not.toContain('party');
    }
  });

  it('the wedding frame is unchanged', () => {
    const f = previewFrameFor('wedding');
    expect(f.eyebrow).toBe('Save the date');
    expect(f.verbLine).toBe('are getting married');
    expect(f.storyEyebrow).toBe('Our story');
    expect(f.storyTitle).toBe('How we met');
    expect(f.rsvpCta).toBe('RSVP');
  });

  it('an unset occasion falls back to the generic pack, never wedding copy', () => {
    const f = previewFrameFor(undefined);
    expect(f.eyebrow).toBe('Save the date');
    expect(f.storyEyebrow).not.toBe('Our story');
    expect(f.verbLine).not.toContain('married');
  });
});

describe('orderPalettesForOccasion — voice-routed preset order', () => {
  it('solemn voices never lead with Groovy Garden', () => {
    for (const id of ['memorial', 'funeral']) {
      const ordered = orderPalettesForOccasion(PALETTES, id);
      expect(ordered[0].id).not.toBe('groovy-garden');
      expect(defaultPaletteIdFor(PALETTES, id)).not.toBe('groovy-garden');
    }
  });

  it('reordering is a permutation — the set never changes', () => {
    for (const et of EVENT_TYPES) {
      const ordered = orderPalettesForOccasion(PALETTES, et.id);
      expect(ordered.map((p) => p.id).sort()).toEqual(PALETTES.map((p) => p.id).sort());
    }
  });

  it('celebratory occasions keep the authored order', () => {
    // (Wedding is CEREMONIAL in the registry — it deliberately leads
    // gold. Birthday/reunion/housewarming are the celebratory set.)
    for (const id of ['birthday', 'reunion', 'housewarming']) {
      expect(orderPalettesForOccasion(PALETTES, id).map((p) => p.id)).toEqual(
        PALETTES.map((p) => p.id),
      );
    }
  });
});
