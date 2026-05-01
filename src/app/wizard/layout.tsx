// Guard every /wizard/* surface. Unauthenticated users land on
// /login with ?next= preserved so they return to the wizard after
// signing in. Mirrors src/app/dashboard/layout.tsx.

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function WizardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/login?next=/wizard/new');
  }
  return <>{children}</>;
}
