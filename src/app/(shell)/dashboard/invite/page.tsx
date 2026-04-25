export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSiteConfig } from '@/lib/db';
import { InviteDesigner } from '@/components/pearloom/invite/InviteDesigner';

export const metadata: Metadata = {
  title: 'Invite designer · Pearloom',
  description: 'Design a save-the-date or invite that matches your site.',
};

export default async function InviteDesignerPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; domain?: string }>;
}) {
  const params = await searchParams;
  const slug = params.site || params.domain;

  // Force the user through the site picker so the designer always reflects
  // a real event — no silent demo data.
  if (!slug) redirect('/dashboard/event?next=/dashboard/invite');

  const cfg = await getSiteConfig(slug);
  if (!cfg?.manifest) redirect('/dashboard/event?next=/dashboard/invite');

  const names: [string, string] =
    Array.isArray(cfg.names) && cfg.names.length >= 2
      ? [cfg.names[0], cfg.names[1]]
      : ['Your', 'Celebration'];

  return <InviteDesigner siteSlug={slug} manifest={cfg.manifest} names={names} />;
}
