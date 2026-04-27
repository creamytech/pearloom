import type { Metadata } from 'next';
import { LibraryPage } from '@/components/pearloom/pages/LibraryPage';

export const metadata: Metadata = {
  title: 'Photo library · Pearloom',
  description: 'Every photo you\'ve uploaded, in one place. Add more, re-use them across any site.',
};

export default function Page() {
  return <LibraryPage />;
}
