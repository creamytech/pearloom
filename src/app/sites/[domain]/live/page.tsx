import { getSiteConfig } from '@/lib/db';
import { notFound } from 'next/navigation';
import { LivePhotoWall } from '@/components/live/LivePhotoWall';

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
