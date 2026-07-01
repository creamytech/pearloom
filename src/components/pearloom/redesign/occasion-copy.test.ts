import { describe, it, expect } from 'vitest';
import { occasionCopyFor, WEDDING_VOICES } from './occasion-copy';
import { EVENT_TYPES } from '@/lib/event-os/event-types';
import { SOLO_OCCASIONS } from '@/lib/event-os/solo-occasions';

/* Couple-romance copy that must never leak onto non-couple sites —
   the exact bug this module fixes ("How we met" on a solo birthday). */
const COUPLE_ARC = new Set(['wedding', 'engagement', 'anniversary', 'vow-renewal']);
const COUPLE_PHRASES = ['how we met', 'together, at last', 'putting a ring on it', 'as we marry', 'honeymoon'];

describe('occasionCopyFor', () => {
  it('returns a complete pack for every registered occasion', () => {
    for (const e of EVENT_TYPES) {
      const c = occasionCopyFor(e.id);
      expect(c.lead, e.id).toBeTruthy();
      expect(c.tagline, e.id).toBeTruthy();
      expect(c.storyEyebrow, e.id).toBeTruthy();
      expect(c.storyTitle, e.id).toBeTruthy();
      expect(c.storyBodyDemo, e.id).toBeTruthy();
      expect(c.navStory, e.id).toBeTruthy();
      expect(c.rsvpTitle, e.id).toBeTruthy();
      expect(c.rsvpBody, e.id).toBeTruthy();
      expect(c.registryBody, e.id).toBeTruthy();
      expect(c.registryDemoStores.length, e.id).toBeGreaterThan(0);
      expect(c.scheduleDemo.length, e.id).toBeGreaterThan(0);
      expect(c.faqDemo.length, e.id).toBeGreaterThan(0);
      expect(c.cta, e.id).toBeTruthy();
      expect(c.detailsDressDemo, e.id).toBeTruthy();
      expect(c.detailsGiftsCard[0], e.id).toBeTruthy();
      expect(c.detailsGiftsCard[1], e.id).toBeTruthy();
    }
  });

  it('never serves couple-romance copy to non-couple occasions', () => {
    for (const e of EVENT_TYPES) {
      if (COUPLE_ARC.has(e.id)) continue;
      const c = occasionCopyFor(e.id);
      const all = [
        c.lead, c.tagline, c.storyEyebrow, c.storyTitle, c.storyItalic,
        c.storyBodyDemo, c.navStory, c.rsvpTitle, c.rsvpBody, c.registryBody,
        ...c.registryDemoStores, ...c.faqDemo,
        ...c.scheduleDemo.flatMap((r) => [r.t, r.l, r.s]),
      ].join(' · ').toLowerCase();
      for (const phrase of COUPLE_PHRASES) {
        expect(all, `${e.id} leaks "${phrase}"`).not.toContain(phrase);
      }
    }
  });

  it('solo occasions never say "Our story"', () => {
    for (const id of SOLO_OCCASIONS) {
      const c = occasionCopyFor(id);
      expect(c.storyEyebrow, id).not.toBe('Our story');
      expect(c.navStory, id).not.toBe('Our story');
    }
  });

  it('memorial and funeral read solemn', () => {
    for (const id of ['memorial', 'funeral']) {
      const c = occasionCopyFor(id);
      expect(c.lead).toBe('In loving memory');
      expect(c.navStory).toBe('Their story');
      expect(c.registryBody.toLowerCase()).toContain('in lieu of flowers');
      /* No party furniture in the solemn schedule demo. */
      const labels = c.scheduleDemo.map((r) => r.l.toLowerCase()).join(' ');
      expect(labels).not.toContain('dancing');
      expect(labels).not.toContain('cocktails');
    }
  });

  it('wedding responds to the Pear-voice pick; other occasions get safe overlays; solemn ignores it', () => {
    expect(occasionCopyFor('wedding', 'playful').tagline).toBe(WEDDING_VOICES.playful.tagline);
    expect(occasionCopyFor('wedding', 'poetic').storyTitle).toBe(WEDDING_VOICES.poetic.storyTitle);
    /* Non-wedding overlays touch only occasion-safe fields. */
    expect(occasionCopyFor('birthday', 'playful').tagline).toBe(occasionCopyFor('birthday').tagline);
    expect(occasionCopyFor('birthday', 'playful').rsvpTitle).toBe('Get in here');
    expect(occasionCopyFor('birthday', 'poetic').tagline).toBe('of all the days, this one');
    expect(occasionCopyFor('birthday', 'poetic').storyTitle).toBe(occasionCopyFor('birthday').storyTitle);
    /* Solemn occasions ignore voice entirely. */
    expect(occasionCopyFor('memorial', 'playful')).toEqual(occasionCopyFor('memorial'));
    expect(occasionCopyFor('funeral', 'poetic')).toEqual(occasionCopyFor('funeral'));
  });

  it('legacy manifests (no occasion) keep wedding copy; unknown occasions get the generic pack', () => {
    expect(occasionCopyFor(undefined).storyTitle).toBe('How we');
    expect(occasionCopyFor(null).storyTitle).toBe('How we');
    const unknown = occasionCopyFor('block-party');
    expect(unknown.storyTitle).toBe('The story');
    expect(unknown.tagline).not.toBe('together, at last');
  });
});
