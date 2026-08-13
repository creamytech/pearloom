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
  searchParams: Promise<{ site?: string; domain?: string; thankTo?: string; gift?: string }>;
}) {
  // No more "select a site" redirect. URL ?site= override still
  // wins; otherwise the loader reads the sidebar's globally-
  // selected site via useSelectedSite.
  const params = await searchParams;
  const slug = params.site || params.domain || null;
  // ?thankTo=&gift= — the registry ledger's "Open in Studio" deep
  // link. Opens the thank-you card pre-addressed to the giver.
  const thankTo = (params.thankTo ?? '').trim().slice(0, 80);
  const initialThanks = thankTo
    ? { to: thankTo, gift: (params.gift ?? '').trim().slice(0, 120) || undefined }
    : null;
  return <StudioLoader initialSlug={slug} initialThanks={initialThanks} />;
}
