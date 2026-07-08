import type { Metadata } from 'next';
import { DashCircle } from '@/components/marketing/design/dash/DashCircle';

export const metadata: Metadata = {
  title: 'Circle · Pearloom',
  description: 'The people you celebrate with.',
};

export default function CirclePage() {
  return <DashCircle />;
}
