export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { DashShell } from '@/components/marketing/v2/DashShell';
import { DashHome } from '@/components/marketing/v2/DashHome';

export const metadata: Metadata = {
  title: 'Dashboard | Pearloom',
  description: 'Manage your celebration sites, photos, and guest lists.',
};

export default function DashboardPage() {
  return (
    <DashShell>
      <DashHome />
    </DashShell>
  );
}
