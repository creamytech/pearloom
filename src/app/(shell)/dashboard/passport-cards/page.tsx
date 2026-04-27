import type { Metadata } from 'next';
import { PassportCardsPage } from '@/components/pearloom/pages/PassportCardsPage';

export const metadata: Metadata = {
  title: 'Passport cards · Pearloom',
  description: 'One printable card per guest — with their own QR to their Passport.',
};

export default function Page() {
  return <PassportCardsPage />;
}
