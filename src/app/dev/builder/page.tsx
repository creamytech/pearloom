// Dev-only preview of BuilderV8 with a mock manifest so designers /
// reviewers can see the site builder without going through auth.
// Renders only when NODE_ENV !== 'production'.

import { notFound } from 'next/navigation';
import { BuilderV8 } from '@/components/pearloom/pages/BuilderV8';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

export default function BuilderDevPreview() {
  if (process.env.NODE_ENV === 'production') notFound();

  const manifest = {
    occasion: 'wedding',
    themeFamily: 'v8',
    vibes: ['warm', 'groovy'],
    palette: 'groovy-garden',
    themeName: 'Groovy Ceremony 2.3',
    motif: 'pear',
    spacing: 'Comfortable',
    imagery: 'warm',
    chapters: [],
    logistics: {
      date: '2025-06-22',
      venue: 'The Wildflower Barn · Portland, OR',
      rsvpDeadline: '2025-05-20',
      dresscode: 'Garden party',
    },
  } as unknown as StoryManifest;

  // Point the demo builder at /dev/site so the iframe actually shows the v8
  // renderer instead of the empty-site fallback.
  return (
    <BuilderV8
      manifest={manifest}
      siteSlug="demo"
      names={['Alex', 'Jamie']}
      previewPathOverride="/dev/site"
    />
  );
}
