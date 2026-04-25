export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { VendorsPage } from '@/components/pearloom/pages/VendorsPage';
import { DashLayout } from '@/components/pearloom/dash/DashShell';

export const metadata: Metadata = {
  title: 'Vendors · Pearloom',
  description: 'Florists, photographers, DJs, planners, caterers — curated to match your celebration\'s vibe.',
};

export default function Page() {
  return (
    <DashLayout
      active="vendors"
      title="Vendors"
      subtitle="Florists, photographers, DJs, planners, caterers — curated to match your celebration's vibe."
      hideTopbar
    >
      <VendorsPage embedded />
    </DashLayout>
  );
}
