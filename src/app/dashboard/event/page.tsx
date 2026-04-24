export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { EventIndexPage } from '@/components/pearloom/pages/EventIndexPage';

export const metadata: Metadata = {
  title: 'My Sites · Pearloom',
  description: 'All the celebration sites you’re weaving.',
};

export default function Page() {
  return <EventIndexPage />;
}
