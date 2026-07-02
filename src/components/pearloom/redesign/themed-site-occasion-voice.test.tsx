// Occasion-voice sweep (2026-07-02) — pins that the renderer's
// hardcoded fallbacks now route through occasionCopyFor: the story
// timeline's chip rail, the countdown label, the music copy, and
// the map eyebrow must read solemn on a memorial and never leak
// "We met / dance floor" party voice.
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ThemedSite } from './ThemedSite';
import { GuestPlaylist } from './GuestPlaylist';
import { hydrateManifestForRedesign } from './hydrate-manifest';
import { occasionCopyFor } from './occasion-copy';
import type { StoryManifest } from '@/types';

function manifestFor(occasion: string): StoryManifest {
  return {
    names: ['June', ''],
    theme: {},
    chapters: [],
    occasion,
    /* Authored story body (no chips) — passes the published
       honesty gate so the timeline renders, exercising the CHIP
       fallback specifically. */
    storySection: { body: 'A story the host actually wrote.' },
    layouts: { story: 'timeline', countdown: 'cards', map: 'embed', music: 'card' },
    logistics: { date: '2199-10-28', venue: 'The Old Hall' },
    published: true,
    music: { provider: 'spotify', url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' },
    blockOrder: ['story', 'schedule', 'countdown', 'map', 'music', 'rsvp'],
  } as unknown as StoryManifest;
}

function renderSite(occasion: string): string {
  const m = hydrateManifestForRedesign(manifestFor(occasion));
  return renderToString(<ThemedSite manifest={m} names={['June', '']} siteSlug="voice-test" />);
}

describe('occasion voice on the published renderer', () => {
  it('memorial: solemn chip rail, gathered countdown, no dance-floor music', () => {
    const html = renderSite('memorial');
    // Story timeline chip fallback — never the wedding rail.
    expect(html).not.toContain('We met');
    expect(html).toContain('The early years');
    // Countdown label.
    expect(html).toContain('Until we gather');
    expect(html).not.toContain('Until we celebrate');
    // Music block copy.
    expect(html).toContain('Songs they loved');
    expect(html).not.toContain('dance floor');
    // Map eyebrow.
    expect(html).toContain('Where we gather');
  });

  it('wedding: keeps the party voice', () => {
    const html = renderSite('wedding');
    expect(html).toContain('We met');
    expect(html).toContain('Until we celebrate');
    expect(html).toContain('Songs for the dance floor');
  });

  it('guest-playlist composer hint follows the occasion voice', () => {
    // GuestPlaylist is next/dynamic inside ThemedSite (no SSR here),
    // so pin the prop contract on the component directly with the
    // exact hint MusicBlock passes (occasionCopyFor().musicComposerHint).
    const solemn = renderToString(
      <GuestPlaylist siteSlug="s" suggestionsOn composerHint={occasionCopyFor('memorial').musicComposerHint} />,
    );
    expect(solemn).toContain('Share a song that brings them back.');
    expect(solemn).not.toContain('dance floor');
    const wedding = renderToString(
      <GuestPlaylist siteSlug="s" suggestionsOn composerHint={occasionCopyFor('wedding').musicComposerHint} />,
    );
    expect(wedding).toContain('The dance floor takes requests.');
  });
});
