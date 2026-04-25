export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { DashHomeV8 } from '@/components/pearloom/pages/DashHomeV8';

export const metadata: Metadata = {
  title: 'Dashboard · Pearloom',
  description: 'Manage your celebration sites, photos, and guest lists.',
};

export default function DashboardPage() {
  return <DashHomeV8 />;
}
