import type { Metadata } from 'next';
import { DashAnalytics } from '@/components/marketing/design/dash/DashAnalytics';

export const metadata: Metadata = {
  title: 'Analytics | Pearloom',
  description: 'Quiet numbers, warm readings.',
};

export default function AnalyticsPage() {
  return <DashAnalytics />;
}
