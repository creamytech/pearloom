export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard | Pearloom',
  description: 'Manage your celebration sites, photos, and guest lists.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
