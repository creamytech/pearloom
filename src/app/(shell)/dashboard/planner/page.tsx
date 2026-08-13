import type { Metadata } from 'next';
import { PlannerPage } from '@/components/pearloom/pages/PlannerPage';

export const metadata: Metadata = {
  title: 'Your client book · Pearloom',
  description: 'Every celebration you co-host, ordered by what needs attention.',
};

export default function Page() {
  return <PlannerPage />;
}
