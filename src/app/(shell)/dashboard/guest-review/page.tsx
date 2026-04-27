export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GuestReviewClient } from './GuestReviewClient';

export const metadata: Metadata = {
  title: "Pear's review · Pearloom",
  description: 'AI-assisted guest list intelligence: duplicates, VIPs, stale RSVPs, address gaps.',
};

export default async function GuestReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login?next=/dashboard/guest-review');
  const sp = await searchParams;
  return <GuestReviewClient siteSlug={sp.site ?? null} />;
}
