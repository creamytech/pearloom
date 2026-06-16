import type { Metadata } from 'next';
import { RegistryDashboardClient } from './RegistryDashboardClient';
import { DashSurfaceGate } from '@/components/pearloom/dash/DashSurfaceGate';

export const metadata: Metadata = {
  title: 'Registry · Pearloom',
  description: 'Native registry items guests can claim and pay for through Pearloom.',
};

export default function RegistryPage() {
  return (
    <DashSurfaceGate surface="registry" active="registry" title="Registry">
      <RegistryDashboardClient />
    </DashSurfaceGate>
  );
}
