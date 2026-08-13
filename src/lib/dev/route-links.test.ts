// ─────────────────────────────────────────────────────────────
// Every internal link goes somewhere.
//
// This test exists because of a real bug: the publish modal's
// "Invite your guests →" — the highest-intent click in the funnel,
// directly under "It's pressed." — pointed at /dashboard/guests,
// which does not exist. The roster is LABELLED "Guests" and lives
// at /dashboard/rsvp. Nothing caught it: it doesn't break a build,
// it doesn't fail a type-check, and the Playwright link crawler
// only walks public pages from a seed list, so it never reached a
// modal behind auth.
//
// So the guarantee moves into the suite. A new dead link now fails
// here instead of on a host.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
// Plain .mjs dev tooling, shared with scripts/route-link-audit.mjs.
import { findDeadLinks, matchesRoute, literalPrefixSegments, prefixIsServed } from './route-links.mjs';

interface Dead { pathname: string; file: string; line: number; source: string }
interface Result { routes: unknown[]; links: unknown[]; dead: Dead[] }

describe('the product has no dead internal links', () => {
  const result = findDeadLinks() as Result;

  it('resolves every hard-coded href, push and redirect', () => {
    const report = result.dead
      .map((d) => `  ${d.pathname}\n      ${d.file}:${d.line}  ${d.source}`)
      .join('\n');
    expect(result.dead, `Dead internal links:\n${report}`).toHaveLength(0);
  });

  it('actually scanned the app — a silent zero would pass vacuously', () => {
    // If the collectors ever break, `dead: []` above would still be
    // green. These floors make that impossible to miss.
    expect(result.routes.length).toBeGreaterThan(100);
    expect(result.links.length).toBeGreaterThan(100);
  });
});

describe('route matching', () => {
  const route = (segments: string[]) => ({ segments, pattern: `/${segments.join('/')}` });

  it('matches a plain path', () => {
    expect(matchesRoute('/dashboard/rsvp', route(['dashboard', 'rsvp']))).toBe(true);
    expect(matchesRoute('/dashboard/guests', route(['dashboard', 'rsvp']))).toBe(false);
  });

  it('matches a dynamic segment', () => {
    expect(matchesRoute('/editor/emma-james', route(['editor', '[siteSlug]']))).toBe(true);
  });

  it('does not let a dynamic segment swallow extra depth', () => {
    expect(matchesRoute('/editor/emma/extra', route(['editor', '[siteSlug]']))).toBe(false);
  });

  it('matches catch-all routes at any depth', () => {
    expect(matchesRoute('/sites/a/b/c', route(['sites', '[...path]']))).toBe(true);
  });
});

describe('template-literal prefixes', () => {
  const routes = [
    { segments: ['editor', '[siteSlug]'] },
    { segments: ['dashboard', 'rsvp'] },
    { segments: ['g', '[token]'] },
  ];

  it('keeps only the whole literal segments before the interpolation', () => {
    // `/editor/${slug}` → the segment next to ${ is a fragment.
    expect(literalPrefixSegments('/editor/${slug}')).toEqual(['editor']);
    expect(literalPrefixSegments('/dashboard/rsvp/${id}')).toEqual(['dashboard', 'rsvp']);
    expect(literalPrefixSegments('/g/${token}')).toEqual(['g']);
  });

  it('accepts a prefix some route serves', () => {
    expect(prefixIsServed(['editor'], routes)).toBe(true);
    expect(prefixIsServed(['dashboard', 'rsvp'], routes)).toBe(true);
  });

  it('rejects a typo’d prefix — the bug this half exists to catch', () => {
    expect(prefixIsServed(['dashboard', 'guest'], routes)).toBe(false);
    expect(prefixIsServed(['editr'], routes)).toBe(false);
  });

  it('never blocks on an empty prefix — nothing is knowable there', () => {
    expect(prefixIsServed([], routes)).toBe(true);
  });
});
