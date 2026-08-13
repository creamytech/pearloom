// TEMP — true SSR→hydrate cycle with the real crashing manifest.
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act } from 'react';
import { ThemedSite } from './ThemedSite';
import { hydrateManifestForRedesign } from './hydrate-manifest';
import type { StoryManifest } from '@/types';

const SCOTTY = {
  copy: { qrTone: 'ink' },
  faqs: [{ order: 0, answer: 'Dress up.', question: 'What should I wear?' }],
  kitId: 'glass',
  names: ['Scott', ''],
  theme: {},
  density: 'comfortable',
  edition: 'almanac',
  layouts: { nav: 'centered', story: 'timeline', schedule: 'timeline', countdown: 'ribbon' },
  texture: 'letterpress',
  themeId: 'midnight',
  chapters: [],
  monogram: { frame: 'gate', initials: 'S & B' },
  occasion: 'birthday',
  logistics: { date: '2026-10-28', venue: 'Sleepy Hollow · NY, USA' },
  published: true,
  themeVars: { '--t-ink': '#FF00DD', '--t-paper': '#A8FFD9', '--t-accent': '#070014' },
  blockOrder: ['story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'rsvp', 'faq', 'countdown'],
  siteLayout: 'magazine',
  motifLayout: 'corners',
  publishedAt: '2026-06-12T21:14:07.369Z',
  themeFamily: 'v8',
  motifsEnabled: true,
  textureIntensity: 0,
} as unknown as StoryManifest;

describe('hydration smoke', () => {
  it('hydrates SSR output without errors', async () => {
    const m = hydrateManifestForRedesign(SCOTTY);
    const ui = <ThemedSite manifest={m} names={['Scott', '']} siteSlug="scotty" />;
    const html = renderToString(ui);
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ')); });
    try {
      await act(async () => { hydrateRoot(host, ui); });
    } finally {
      spy.mockRestore();
    }
    if (errors.length) throw new Error('HYDRATION ERRORS:\n' + errors.join('\n---\n').slice(0, 5000));
    expect(host.innerHTML.length).toBeGreaterThan(500);
  });
});
