import type { Metadata } from 'next';
import { DashDirector } from '@/components/marketing/design/dash/DashDirector';

export const metadata: Metadata = {
  title: 'The Director | Pearloom',
  description: 'Your AI event planner. Budget, vendors, timeline, checklist, all in one conversation.',
};

export default function DirectorPage() {
  return <DashDirector />;
}
