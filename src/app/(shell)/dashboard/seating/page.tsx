import type { Metadata } from 'next';
import { SeatingArrangerPage } from '@/components/pearloom/pages/SeatingArrangerPage';
import { DashSurfaceGate } from '@/components/pearloom/dash/DashSurfaceGate';

export const metadata: Metadata = {
  title: 'Seating arranger · Pearloom',
  description: 'Drag guests onto tables. Set constraints. Pear can auto-solve the rest.',
};

export default function Page() {
  return (
    <DashSurfaceGate surface="seating" active="seating" title="Seating">
      <SeatingArrangerPage />
    </DashSurfaceGate>
  );
}
