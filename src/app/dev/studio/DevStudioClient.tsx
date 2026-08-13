'use client';

// Fixture mount of the real StudioApp — same shape the e2e suite's
// synthetic manifest uses. The site look is the 'garden' theme so
// the "Your site" row has something real to derive from.
import type { StoryManifest } from '@/types';
import { StudioApp } from '@/components/pearloom/studio/StudioApp';

const FIXTURE_MANIFEST = {
  occasion: 'wedding',
  themeId: 'garden',
  logistics: {
    date: '2026-10-01',
    venue: 'Lark Hill Farm',
    location: 'Hudson, New York',
  },
  studio: {},
} as unknown as StoryManifest;

export function DevStudioClient() {
  return (
    <StudioApp
      siteSlug="dev-fixture"
      manifest={FIXTURE_MANIFEST}
      names={['Shauna', 'Scott']}
      initialThanks={null}
    />
  );
}
