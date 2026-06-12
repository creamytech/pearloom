// ─────────────────────────────────────────────────────────────
// Published shell hydration — true SSR → hydrateRoot cycle with
// a production-shaped manifest (the 2026-06-12 "scotty" crash:
// countdown digits differed server/client and React 19 threw the
// whole tree to the error screen). Guards BOTH first paints a
// guest can get: the password gate and the open site.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act } from 'react';
import { PublishedSiteShell } from './PublishedSiteShell';
import type { StoryManifest } from '@/types';

/* jsdom lacks the browser APIs the shell's overlays use after
   mount — polyfill them so the only failures this test can
   produce are REAL hydration mismatches. */
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
if (typeof (globalThis as Record<string, unknown>).IntersectionObserver === 'undefined') {
  (globalThis as Record<string, unknown>).IntersectionObserver = class {
    observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
  };
}

const BASE = {
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
  occasion: 'birthday',
  logistics: { date: '2026-10-28', venue: 'Sleepy Hollow · NY, USA' },
  published: true,
  themeVars: { '--t-ink': '#FF00DD', '--t-paper': '#A8FFD9', '--t-accent': '#070014' },
  blockOrder: ['story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'rsvp', 'faq', 'countdown'],
  motifLayout: 'corners',
  publishedAt: '2026-06-12T21:14:07.369Z',
  motifsEnabled: true,
  textureIntensity: 0,
} as unknown as StoryManifest;

async function hydrateClean(manifest: StoryManifest) {
  const ui = (
    <PublishedSiteShell manifest={manifest} names={['Scott', '']} siteSlug="scotty" prettyUrl="pearloom.com/birthday/scotty" />
  );
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
    host.remove();
  }
  return errors;
}

describe('published shell hydration', () => {
  it('hydrates the open site without errors', async () => {
    const errors = await hydrateClean(BASE);
    if (errors.length) throw new Error('HYDRATION ERRORS (open):\n' + errors.join('\n---\n').slice(0, 5000));
    expect(errors).toEqual([]);
  });
  it('hydrates the password-gated site without errors', async () => {
    const gated = { ...(BASE as unknown as Record<string, unknown>), privacyGate: { password: 'x' } } as unknown as StoryManifest;
    const errors = await hydrateClean(gated);
    if (errors.length) throw new Error('HYDRATION ERRORS (gated):\n' + errors.join('\n---\n').slice(0, 5000));
    expect(errors).toEqual([]);
  });
});
