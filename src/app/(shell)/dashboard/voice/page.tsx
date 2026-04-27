export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { VoiceDnaClient } from './VoiceDnaClient';

export const metadata: Metadata = {
  title: 'Voice DNA · Pearloom',
  description: 'Capture your voice once, and Pear sounds like you in every draft.',
};

export default async function VoiceDnaPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login?next=/dashboard/voice');
  const sp = await searchParams;
  if (!sp.site) redirect('/dashboard/event?next=/dashboard/voice');
  return <VoiceDnaClient siteSlug={sp.site} />;
}
