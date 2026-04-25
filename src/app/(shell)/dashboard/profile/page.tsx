export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { DashSettings } from '@/components/marketing/design/dash/DashSettings';

export const metadata: Metadata = {
  title: 'Settings | Pearloom',
  description: 'Your preferences, woven in.',
};

export default function SettingsPage() {
  return <DashSettings />;
}
