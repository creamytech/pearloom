export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { DashGuests } from '@/components/marketing/design/dash/DashGuests';

export const metadata: Metadata = {
  title: 'Guests | Pearloom',
  description: 'RSVPs, dietary notes, and guest moments.',
};

export default function GuestsPage() {
  return <DashGuests />;
}
