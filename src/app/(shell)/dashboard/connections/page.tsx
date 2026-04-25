export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { DashConnections } from '@/components/marketing/design/dash/DashConnections';

export const metadata: Metadata = {
  title: 'Connections | Pearloom',
  description: 'Every person is a knot. Every event is a thread.',
};

export default function ConnectionsPage() {
  return <DashConnections />;
}
