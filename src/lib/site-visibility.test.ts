// The visibility spine's resolution contract (Sprint V.1). Four
// legacy flags become one truth; this pins every branch of the
// read-migration so no pre-spine manifest changes behavior except
// where the old behavior was the bug.

import { describe, expect, it } from 'vitest';
import type { StoryManifest } from '@/types';
import {
  gatePasswordFor,
  isPrivateByDefaultOccasion,
  readSiteVisibility,
  visibilityAllowsIndexing,
  visibilityRendersForAnon,
} from '@/lib/site-visibility';

/** Minimal pressed manifest — loose-cast like the resolver reads it. */
function pressed(extra: Record<string, unknown> = {}): StoryManifest {
  return { published: true, publishedAt: '2026-08-01T00:00:00.000Z', ...extra } as unknown as StoryManifest;
}

function draft(extra: Record<string, unknown> = {}): StoryManifest {
  return { ...extra } as unknown as StoryManifest;
}

describe('readSiteVisibility — the press outranks everything', () => {
  it('an unpressed manifest is draft, whatever its fields claim', () => {
    expect(readSiteVisibility(draft())).toBe('draft');
    expect(readSiteVisibility(draft({ visibility: 'public' }))).toBe('draft');
    expect(readSiteVisibility(draft({ privacyGate: { password: 'x' } }))).toBe('draft');
  });

  it('explicit draft on a pressed manifest is the host pulling it back', () => {
    expect(readSiteVisibility(pressed({ visibility: 'draft' }))).toBe('draft');
  });
});

describe('readSiteVisibility — explicit states win', () => {
  it('honors public / link-only', () => {
    expect(readSiteVisibility(pressed({ visibility: 'public' }))).toBe('public');
    expect(readSiteVisibility(pressed({ visibility: 'link-only' }))).toBe('link-only');
  });

  it('explicit public beats a stale password field', () => {
    expect(
      readSiteVisibility(pressed({ visibility: 'public', privacyGate: { password: 'old' } })),
    ).toBe('public');
  });

  it('password without a password degrades to public — an empty gate is not protection', () => {
    expect(readSiteVisibility(pressed({ visibility: 'password' }))).toBe('public');
    expect(
      readSiteVisibility(pressed({ visibility: 'password', privacyGate: { password: '  ' } })),
    ).toBe('public');
    expect(
      readSiteVisibility(pressed({ visibility: 'password', privacyGate: { password: 'pearl' } })),
    ).toBe('password');
  });

  it('an unknown value falls through to the legacy derivation', () => {
    expect(readSiteVisibility(pressed({ visibility: 'sparkly' }))).toBe('public');
  });

  it("the field's old soft-signal values map to the closest enforceable state", () => {
    // 'unlisted'/'private' were written by the deleted PearSpotlight
    // wizard and enforced by nothing. Both said "don't spread this".
    expect(readSiteVisibility(pressed({ visibility: 'unlisted' }))).toBe('link-only');
    expect(readSiteVisibility(pressed({ visibility: 'private' }))).toBe('link-only');
    expect(
      readSiteVisibility(pressed({ visibility: 'private', privacyGate: { password: 'x' } })),
    ).toBe('password');
  });
});

describe('readSiteVisibility — pre-spine manifests (legacy read-migration)', () => {
  it('a pressed manifest with no flags is public', () => {
    expect(readSiteVisibility(pressed())).toBe('public');
  });

  it('privacyGate.password → password', () => {
    expect(readSiteVisibility(pressed({ privacyGate: { password: 'pearl' } }))).toBe('password');
  });

  it('legacy comingSoon password wins over privacyGate (the documented precedence)', () => {
    const m = pressed({
      comingSoon: { enabled: true, passwordProtected: true, password: 'legacy' },
      privacyGate: { password: 'newer' },
    });
    expect(readSiteVisibility(m)).toBe('password');
    expect(gatePasswordFor(m)).toBe('legacy');
  });

  it('comingSoon without passwordProtected gates nothing (H7 — it never did)', () => {
    expect(readSiteVisibility(pressed({ comingSoon: { enabled: true } }))).toBe('public');
  });

  it('bachelor/ette press link-only from the registry (L32 — CLAUDE-PRODUCT §8 Q2)', () => {
    expect(isPrivateByDefaultOccasion('bachelorette-party')).toBe(true);
    expect(isPrivateByDefaultOccasion('bachelor-party')).toBe(true);
    expect(isPrivateByDefaultOccasion('wedding')).toBe(false);
    expect(readSiteVisibility(pressed({ occasion: 'bachelorette-party' }))).toBe('link-only');
    expect(readSiteVisibility(pressed({ occasion: 'wedding' }))).toBe('public');
  });

  it('an explicit public choice beats the occasion default', () => {
    expect(
      readSiteVisibility(pressed({ occasion: 'bachelorette-party', visibility: 'public' })),
    ).toBe('public');
  });
});

describe('the derived permissions', () => {
  it('only public is indexable', () => {
    expect(visibilityAllowsIndexing('public')).toBe(true);
    expect(visibilityAllowsIndexing('link-only')).toBe(false);
    expect(visibilityAllowsIndexing('password')).toBe(false);
    expect(visibilityAllowsIndexing('draft')).toBe(false);
  });

  it('anon content-render is exactly the two link-reachable states', () => {
    expect(visibilityRendersForAnon('public')).toBe(true);
    expect(visibilityRendersForAnon('link-only')).toBe(true);
    expect(visibilityRendersForAnon('password')).toBe(false);
    expect(visibilityRendersForAnon('draft')).toBe(false);
  });
});
