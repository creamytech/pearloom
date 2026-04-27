export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CadenceClient } from './CadenceClient';

export const metadata: Metadata = {
  title: 'Send cadence · Pearloom',
  description: 'Plan every save-the-date, reminder, and thank-you for your event.',
};

export default async function CadencePage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login?next=/dashboard/cadence');
  const sp = await searchParams;
  // No more "select a site" redirect — the sidebar's site picker
  // is the single source of truth. Pass the URL site param (if any)
  // and the client falls back to the globally-selected site.
  return <CadenceClient siteSlug={sp.site ?? null} />;
}
