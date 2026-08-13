// PERSONA-PLAN S2 — the Review pressing's honesty gate. The proof
// never dresses an un-authored section in demo copy: it slats. Host
// content always renders real (slat returns null).
import { describe, it, expect } from 'vitest';
import type { StoryManifest } from '@/types';
import { proofSlatFor } from './proof';

const empty = {} as StoryManifest;

describe('proofSlatFor — un-authored sections slat', () => {
  it('the demo-content sections slat on an empty manifest', () => {
    for (const kind of ['story', 'schedule', 'travel', 'registry', 'gallery', 'faq', 'details']) {
      expect(proofSlatFor(kind, empty, 'wedding'), kind).toBeTruthy();
    }
  });

  it('functional chrome renders normally (no slat)', () => {
    for (const kind of ['hero', 'rsvp', 'countdown', 'map', 'music']) {
      expect(proofSlatFor(kind, empty, 'wedding'), kind).toBeNull();
    }
  });

  it('host content always renders real — content wins over the slat', () => {
    const m = {
      chapters: [{ title: 'How we met', body: 'Pottery class, 2021.' }],
      events: [{ time: '4:00 pm', name: 'Ceremony' }],
      travelInfo: { hotels: [{ name: 'The Foundry' }] },
      galleryImages: ['https://example.com/a.jpg'],
      faqs: [{ question: 'Parking?', answer: 'Lot next door.' }],
      detailsCards: [['Dress code', 'Garden formal']],
    } as unknown as StoryManifest;
    for (const kind of ['story', 'schedule', 'travel', 'gallery', 'faq', 'details']) {
      expect(proofSlatFor(kind, m, 'wedding'), kind).toBeNull();
    }
  });

  it('guest-written walls always slat at proof time (no guests yet)', () => {
    expect(proofSlatFor('tributeWall', empty, 'memorial')).toBeTruthy();
    expect(proofSlatFor('adviceWall', empty, 'baby-shower')).toBeTruthy();
  });

  it('obituary: slats un-authored, renders real once written', () => {
    expect(proofSlatFor('obituary', empty, 'memorial')).toBeTruthy();
    const m = { memorial: { obituary: { body: 'Eleanor loved her garden.' } } } as unknown as StoryManifest;
    expect(proofSlatFor('obituary', m, 'memorial')).toBeNull();
  });

  it('solemn occasions get the gentle register', () => {
    const note = proofSlatFor('story', empty, 'memorial');
    expect(note).toContain('gently');
    expect(note).toContain('Nothing is published without you');
  });

  it('slat notes obey the microcopy contract (BRAND §7)', () => {
    for (const kind of ['story', 'schedule', 'travel', 'registry', 'gallery', 'faq', 'details', 'tributeWall', 'obituary']) {
      for (const occ of ['wedding', 'memorial', 'birthday']) {
        const note = proofSlatFor(kind, empty, occ);
        if (!note) continue;
        expect(note.toLowerCase(), `${kind}/${occ}`).not.toMatch(/generated|ai-|loading|empty|no data/);
      }
    }
  });
});
