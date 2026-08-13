import { describe, it, expect } from 'vitest';
import type { StoryManifest } from '@/types';
import {
  studioDefaultsFromLook,
  siteLookAvailable,
  siteThemeRootStyle,
  SITE_LOOK_ID,
} from './studio-defaults-from-look';

/* Helper: build a minimal manifest with just the Look fields the
   bridge reads. */
function look(opts: {
  edition?: StoryManifest['edition'];
  kitId?: StoryManifest['kitId'];
  voiceOverride?: StoryManifest['voiceOverride'];
  accent?: string;
  paper?: string;
  themeId?: string;
  themeVars?: Record<string, string>;
  texture?: string;
}): StoryManifest {
  return {
    edition: opts.edition,
    kitId: opts.kitId,
    voiceOverride: opts.voiceOverride,
    themeId: opts.themeId,
    themeVars: opts.themeVars,
    texture: opts.texture,
    theme: {
      colors: {
        accent: opts.accent ?? '#5C6B3F',
        background: opts.paper,
      },
    },
  } as unknown as StoryManifest;
}

describe('studioDefaultsFromLook — a site with a look WEARS it (ATELIER-PLAN ST.1)', () => {
  it('any themed site seeds palette + fontPair to the site sentinel', () => {
    const d = studioDefaultsFromLook(look({ edition: 'cinema', kitId: 'plate', voiceOverride: 'classic' }));
    expect(d.palette).toBe(SITE_LOOK_ID);
    expect(d.fontPair).toBe(SITE_LOOK_ID);
  });

  it('layout / motif / tone still route through edition / kit / voice', () => {
    const cinema = studioDefaultsFromLook(look({ edition: 'cinema', kitId: 'plate', voiceOverride: 'classic' }));
    expect(cinema.layout).toBe('asym');
    expect(cinema.motif).toBe('monogram');
    expect(cinema.tone).toBe('warm');

    const postcard = studioDefaultsFromLook(look({ edition: 'postcard-box', kitId: 'scrapbook', voiceOverride: 'playful' }));
    expect(postcard.layout).toBe('photo');
    expect(postcard.motif).toBe('tape');
    expect(postcard.tone).toBe('playful');

    const quiet = studioDefaultsFromLook(look({ edition: 'quiet', kitId: 'minimal', voiceOverride: 'poetic' }));
    expect(quiet.layout).toBe('minimal');
    expect(quiet.motif).toBe('none');
    expect(quiet.tone).toBe('spare');
  });

  it('inherits the site texture on first open', () => {
    expect(studioDefaultsFromLook(look({ texture: 'velvet' })).texture).toBe('velvet');
    expect(studioDefaultsFromLook(look({})).texture).toBeNull();
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

describe('siteLookAvailable / siteThemeRootStyle', () => {
  it('detects a look via themeId, themeVars, or legacy colors', () => {
    expect(siteLookAvailable(look({ themeId: 'santorini' }))).toBe(true);
    expect(siteLookAvailable(look({ themeVars: { '--t-accent': '#3E5C76' } }))).toBe(true);
    expect(siteLookAvailable(look({ accent: '#C6703D' }))).toBe(true);
    expect(siteLookAvailable({} as StoryManifest)).toBe(false);
    expect(siteLookAvailable(null)).toBe(false);
  });

  it('resolves the bag from themeId + themeVars (themeVars win)', () => {
    const bag = siteThemeRootStyle(look({ themeId: 'santorini', themeVars: { '--t-accent': '#123456' } })) as Record<string, string>;
    expect(bag['--t-accent']).toBe('#123456');
    expect(typeof bag['--t-paper']).toBe('string');
    expect(typeof bag['--t-display']).toBe('string');
  });

  it('overlays legacy theme.colors when no themeId/themeVars exist', () => {
    const legacyOnly = {
      theme: { colors: { background: '#FBEEEC', foreground: '#222222', accent: '#C97A6E' } },
    } as unknown as StoryManifest;
    const bag = siteThemeRootStyle(legacyOnly) as Record<string, string>;
    expect(bag['--t-paper']).toBe('#FBEEEC');
    expect(bag['--t-accent']).toBe('#C97A6E');
  });
});
