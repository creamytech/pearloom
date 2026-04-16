import type { Metadata } from 'next';
import AnalyticsClient from './AnalyticsClient';

export const metadata: Metadata = {
  title: 'Analytics | Pearloom',
  description: 'Who visits, what they read, where they came from.',
};

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
