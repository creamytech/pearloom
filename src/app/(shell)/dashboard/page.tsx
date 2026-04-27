import type { Metadata } from 'next';
import { TodayHome } from '@/components/pearloom/pages/TodayHome';

export const metadata: Metadata = {
  title: 'Dashboard · Pearloom',
  description: 'Today, in your hands.',
};

export default function DashboardPage() {
  // /dashboard is the focused "today" view. The old kitchen-sink
  // DashHomeV8 stays in the codebase but is no longer routed here —
  // each of its sections moved to its proper tab.
  return <TodayHome />;
}
