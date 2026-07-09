import type { Metadata } from 'next';
import { QrPosterPage } from '@/components/pearloom/pages/QrPosterPage';

export const metadata: Metadata = {
  title: 'QR poster · Pearloom',
  description: 'A printable scan-to-site poster for the welcome table.',
};

export default function Page() {
  return <QrPosterPage />;
}
