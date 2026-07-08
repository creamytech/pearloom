// Core-section empty-state honesty sweep (2026-07-03).
//
// Every CORE section, when empty + EDITABLE (the editor canvas),
// must paint an OBVIOUS editorial empty-state instead of an
// anonymous textured void — and when empty + PUBLISHED must keep the
// honesty contract (the config-driven sections render NOTHING; guests
// never see scaffolding). Gate is `editable`, per CLAUDE-DESIGN §7.
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ThemedSite } from './ThemedSite';
import { hydrateManifestForRedesign } from './hydrate-manifest';
import type { StoryManifest } from '@/types';

/* A brand-new site: no gallery photos, no event date, no venue, no
   music link. Gallery is a core section (always present); countdown /
   map / music ride in via blockOrder (they're opt-in). */
function blankManifest(): StoryManifest {
  return hydrateManifestForRedesign({
    names: ['Alex', 'Jamie'],
    theme: {},
    chapters: [],
    occasion: 'wedding',
    blockOrder: ['gallery', 'countdown', 'map', 'music', 'rsvp'],
  } as unknown as StoryManifest);
}

function renderEditable(): string {
  return renderToString(
    <ThemedSite manifest={blankManifest()} names={['Alex', 'Jamie']} editable />,
  );
}

function renderPublished(): string {
  const m = { ...blankManifest(), published: true } as unknown as StoryManifest;
  return renderToString(<ThemedSite manifest={m} names={['Alex', 'Jamie']} siteSlug="empty-test" />);
}

describe('empty core sections in the editor canvas', () => {
  it('gallery shows a clear "add photos" empty-state (not anonymous tiles)', () => {
    const html = renderEditable();
    expect(html).toContain('Add your first photos');
    // plain empty-state (BRAND §7 clarity-first).
    expect(html).toContain('No photos yet.');
  });

  it('countdown / map / music paint a guided empty-state, not bare texture', () => {
    const html = renderEditable();
    expect(html).toContain('Set the event date in the Hero panel');
    expect(html).toContain('Add a venue in the Hero panel');
    /* Music empty renders its VARIANT frame with a guided player
       placeholder (so switching layouts stays meaningful before a
       link is pasted), not the generic SectionEmpty card. */
    expect(html).toContain('Paste a Spotify, Apple Music, or YouTube link');
  });

  it('empty music still renders its variant frame so the Layout picker works', () => {
    // jukebox is the most distinct frame — its dark plate + eyebrow
    // must render around the placeholder even with no link set.
    const m = hydrateManifestForRedesign({
      names: ['Alex', 'Jamie'], theme: {}, chapters: [], occasion: 'wedding',
      blockOrder: ['music'], layouts: { music: 'jukebox' },
    } as unknown as StoryManifest);
    const html = renderToString(<ThemedSite manifest={m} names={['Alex', 'Jamie']} editable />);
    // Guided placeholder present …
    expect(html).toContain('Paste a Spotify, Apple Music, or YouTube link');
    // … AND the jukebox FRAME wraps it (the ◆ marquee eyebrow only
    // the jukebox variant emits) — proving the Layout switch is live
    // in the empty state, not collapsed to one generic card.
    expect(html).toContain('◆');
  });
});

describe('empty core sections on the published site (honesty)', () => {
  it('never leaks the editor empty-state scaffolding to guests', () => {
    const html = renderPublished();
    expect(html).not.toContain('Add your first photos');
    // config-driven sections render NOTHING when empty + published.
    expect(html).not.toContain('Set the event date in the Hero panel');
    expect(html).not.toContain('Add a venue in the Hero panel');
  });
});
