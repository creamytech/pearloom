export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { StudioLoader } from './StudioLoader';

export const metadata: Metadata = {
  title: 'Studio · Pearloom',
  description: 'Design save-the-dates, invitations, and thank-yous that match your site.',
};

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; domain?: string }>;
}) {
  // No more "select a site" redirect. URL ?site= override still
  // wins; otherwise the loader reads the sidebar's globally-
  // selected site via useSelectedSite.
  const params = await searchParams;
  const slug = params.site || params.domain || null;
  return <StudioLoader initialSlug={slug} />;
}
