export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { InviteDesignerLoader } from './InviteDesignerLoader';

export const metadata: Metadata = {
  title: 'Invite designer · Pearloom',
  description: 'Design a save-the-date or invite that matches your site.',
};

export default async function InviteDesignerPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; domain?: string }>;
}) {
  // No more "select a site" redirect. URL ?site= override still
  // wins; otherwise the loader reads the sidebar's globally-
  // selected site via useSelectedSite.
  const params = await searchParams;
  const slug = params.site || params.domain || null;
  return <InviteDesignerLoader initialSlug={slug} />;
}
