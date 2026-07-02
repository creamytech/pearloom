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
  searchParams: Promise<{ motifLayout?: string; motifKind?: string; kit?: string; atelier?: string; divider?: string; footer?: string; layouts?: string; occasion?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { motifLayout, motifKind, kit, atelier, divider, footer, layouts, occasion } = await searchParams;

  /* ?layouts=rsvp:split,schedule:timeline — per-section variant
     overrides for visual QA of the alternate layouts. */
  const layoutOverrides: Record<string, string> = {};
  for (const pair of (layouts ?? '').split(',')) {
    const [section, variant] = pair.split(':').map((s) => s.trim());
    if (section && variant) layoutOverrides[section] = variant;
  }

  const demo = DEMO_MANIFEST as unknown as Record<string, unknown>;
  const manifest = {
    ...demo,
    ...(motifLayout ? { motifLayout } : {}),
    ...(motifKind ? { motifKind } : {}),
    ...(kit ? { kitId: kit } : {}),
    ...(atelier === '1' ? { atelier: true } : {}),
    ...(divider ? { dividerLook: divider } : {}),
    ...(footer ? { footerVariant: footer } : {}),
    ...(occasion ? { occasion } : {}),
    ...(Object.keys(layoutOverrides).length
      ? { layouts: { ...(demo.layouts as Record<string, string>), ...layoutOverrides } }
      : {}),
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
