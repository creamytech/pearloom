// Guard every /dashboard/* surface at the edge. Unauthenticated
// users land on /login with ?next= preserved so they return here
// after signing in.

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/login?next=/dashboard');
  }
  return <>{children}</>;
}
