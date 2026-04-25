export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { SeatingArrangerPage } from '@/components/pearloom/pages/SeatingArrangerPage';

export const metadata: Metadata = {
  title: 'Seating arranger · Pearloom',
  description: 'Drag guests onto tables. Set constraints. Pear can auto-solve the rest.',
};

export default function Page() {
  return <SeatingArrangerPage />;
}
