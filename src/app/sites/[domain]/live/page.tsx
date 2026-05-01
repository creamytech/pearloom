import type { Metadata } from 'next';
import { getSiteConfig } from '@/lib/db';
import { notFound } from 'next/navigation';
import { LivePhotoWall } from '@/components/live/LivePhotoWall';

export const metadata: Metadata = {
  title: 'Live Photo Wall | Pearloom',
  description: 'Watch photos appear in real time.',
};

export default async function LivePage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const siteConfig = await getSiteConfig(domain);
  if (!siteConfig) return notFound();

  return (
    <LivePhotoWall
      domain={domain}
      manifest={siteConfig.manifest!}
      names={siteConfig.names}
    />
  );
}
