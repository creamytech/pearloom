// ─────────────────────────────────────────────────────────────
// Pearloom / app/sites/[domain]/v2/page.tsx
// Opt-in preview of the SiteRendererV2 layout for an existing
// published site. Add `?v=2` or visit `/sites/:domain/v2` to
// render the new design without affecting the live version.
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSiteConfig } from '@/lib/db';
import { SiteRendererV2 } from '@/components/marketing/v2/SiteRendererV2';
import type { StoryManifest } from '@/types';

interface Props {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params;
  const config = await getSiteConfig(domain).catch(() => null);
  if (!config) return { title: 'Pearloom' };
  const [a, b] = (config.names ?? ['', '']) as [string, string];
  const title = b ? `${a} & ${b}` : a || 'Pearloom';
  return { title: `${title} | Pearloom` };
}

export default async function SiteV2Page({ params }: Props) {
  const { domain } = await params;
  const config = await getSiteConfig(domain).catch(() => null);
  if (!config) notFound();
  const manifest = (config.manifest ?? null) as StoryManifest | null;
  if (!manifest) notFound();
  const names = (config.names ?? ['', '']) as [string, string];
  return (
    <SiteRendererV2
      manifest={manifest}
      siteId={domain}
      domain={domain}
      names={names}
    />
  );
}
