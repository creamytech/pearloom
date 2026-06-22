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
  searchParams: Promise<{ motifLayout?: string; motifKind?: string; kit?: string; atelier?: string; divider?: string; footer?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { motifLayout, motifKind, kit, atelier, divider, footer } = await searchParams;

  const manifest = {
    ...(DEMO_MANIFEST as unknown as Record<string, unknown>),
    ...(motifLayout ? { motifLayout } : {}),
    ...(motifKind ? { motifKind } : {}),
    ...(kit ? { kitId: kit } : {}),
    ...(atelier === '1' ? { atelier: true } : {}),
    ...(divider ? { dividerLook: divider } : {}),
    ...(footer ? { footerVariant: footer } : {}),
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
