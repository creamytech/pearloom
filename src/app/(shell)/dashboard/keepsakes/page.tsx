export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { KeepsakesPage } from '@/components/pearloom/pages/KeepsakesPage';

export const metadata: Metadata = {
  title: 'Keepsakes · Pearloom',
  description: 'Thank-you notes, anniversary nudges, and other after-the-day keepsakes — all drafted by Pear.',
};

export default function Page() {
  return <KeepsakesPage />;
}
