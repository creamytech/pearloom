import { describe, it, expect } from 'vitest';
import type { StoryManifest } from '@/types';
import { studioDefaultsFromLook } from './studio-defaults-from-look';

/* Helper: build a minimal manifest with just the Look fields the
   bridge reads. */
function look(opts: {
  edition?: StoryManifest['edition'];
  kitId?: StoryManifest['kitId'];
  voiceOverride?: StoryManifest['voiceOverride'];
  accent?: string;
  paper?: string;
}): StoryManifest {
  return {
    edition: opts.edition,
    kitId: opts.kitId,
    voiceOverride: opts.voiceOverride,
    theme: {
      colors: {
        accent: opts.accent ?? '#5C6B3F',
        background: opts.paper,
      },
    },
  } as unknown as StoryManifest;
}

describe('studioDefaultsFromLook', () => {
  it('maps Cinema + Plate + classic voice → asym layout + editorial font + monogram motif', () => {
    const d = studioDefaultsFromLook(look({ edition: 'cinema', kitId: 'plate', voiceOverride: 'classic' }));
    expect(d.layout).toBe('asym');
    expect(d.fontPair).toBe('editorial');
    expect(d.motif).toBe('monogram');
    expect(d.tone).toBe('warm');
  });

  it('maps Postcard Box + Scrapbook + playful → photo layout + garden font + tape motif + playful tone', () => {
    const d = studioDefaultsFromLook(look({ edition: 'postcard-box', kitId: 'scrapbook', voiceOverride: 'playful' }));
    expect(d.layout).toBe('photo');
    expect(d.fontPair).toBe('garden');
    expect(d.motif).toBe('tape');
    expect(d.tone).toBe('playful');
  });

  it('maps Quiet + minimal kit + poetic → minimal layout + modern font + clean + spare tone', () => {
    const d = studioDefaultsFromLook(look({ edition: 'quiet', kitId: 'minimal', voiceOverride: 'poetic' }));
    expect(d.layout).toBe('minimal');
    expect(d.fontPair).toBe('modern');
    expect(d.motif).toBe('none');
    expect(d.tone).toBe('spare');
  });

  it('picks twilight palette when paper is dark (editorial midnight mode)', () => {
    const d = studioDefaultsFromLook(look({ accent: '#C4B5D9', paper: '#1F2236' }));
    expect(d.palette).toBe('twilight');
  });

  it('picks sage palette when accent is olive/green', () => {
    const d = studioDefaultsFromLook(look({ accent: '#5C6B3F' }));
    expect(d.palette).toBe('sage');
  });

  it('picks peach palette when accent is warm orange', () => {
    const d = studioDefaultsFromLook(look({ accent: '#C6703D' }));
    expect(d.palette).toBe('peach');
  });

  it('picks lavender palette when accent is purple', () => {
    const d = studioDefaultsFromLook(look({ accent: '#9B6DC7' }));
    expect(d.palette).toBe('lavender');
  });

  it('picks rose palette when accent is pink-red', () => {
    const d = studioDefaultsFromLook(look({ accent: '#C97A6E' }));
    expect(d.palette).toBe('rose');
  });

  it('picks cream palette when accent is desaturated', () => {
    const d = studioDefaultsFromLook(look({ accent: '#A8A294' }));
    expect(d.palette).toBe('cream');
  });

  it('falls back to almanac defaults when manifest has no Look fields', () => {
    const d = studioDefaultsFromLook({} as StoryManifest);
    expect(d.layout).toBe('classic');     // almanac default
    expect(d.fontPair).toBe('editorial'); // almanac default
    expect(d.motif).toBe('stamp');        // classic kit default
    expect(d.tone).toBe('warm');          // classic voice default
    expect(d.palette).toBe('sage');       // pl-olive fallback hue 80° = sage
  });
});
