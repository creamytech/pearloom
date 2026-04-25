export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { RegistryDashboardClient } from './RegistryDashboardClient';

export const metadata: Metadata = {
  title: 'Registry · Pearloom',
  description: 'Native registry items guests can claim and pay for through Pearloom.',
};

export default function RegistryPage() {
  return <RegistryDashboardClient />;
}
