export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrintOrdersClient } from './PrintOrdersClient';

export const metadata: Metadata = {
  title: 'Print orders · Pearloom',
  description: 'Track Pearloom Print mailings — postcards, invitations, thank-you cards.',
};

export default async function PrintOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login?next=/dashboard/print');
  const sp = await searchParams;
  return <PrintOrdersClient siteFilter={sp.site || null} />;
}
