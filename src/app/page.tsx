export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import LandingPageWrapper from './LandingPageWrapper';

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/dashboard');
  }
  return <LandingPageWrapper />;
}
