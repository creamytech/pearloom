// Dev-only preview of the published-site renderer using the shared
// showcase manifest (src/lib/demo-manifest.ts — same data /demo
// serves in production). Adds ?motifLayout= / ?motifKind= knobs for
// visual QA. Hidden in production so /demo is the public path.

import { notFound } from 'next/navigation';
import { PublishedSiteShell } from '@/components/pearloom/site/PublishedSiteShell';
import { DEMO_MANIFEST, DEMO_NAMES } from '@/lib/demo-manifest';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

export default async function SiteDevPreview({
  searchParams,
}: {
  searchParams: Promise<{ motifLayout?: string; motifKind?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { motifLayout, motifKind } = await searchParams;

  const manifest = {
    ...(DEMO_MANIFEST as unknown as Record<string, unknown>),
    ...(motifLayout ? { motifLayout } : {}),
    ...(motifKind ? { motifKind } : {}),
  } as unknown as StoryManifest;

  return (
    <PublishedSiteShell
      manifest={manifest}
      names={DEMO_NAMES}
      siteSlug="demo"
      prettyUrl="pearloom.com/demo"
    />
  );
}
