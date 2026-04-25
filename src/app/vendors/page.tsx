export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { VendorsPage } from '@/components/pearloom/pages/VendorsPage';

export const metadata: Metadata = {
  title: 'Vendors · Pearloom',
  description: 'Florists, photographers, DJs, planners, caterers — curated to match your celebration\'s vibe.',
};

export default function Page() {
  return <VendorsPage />;
}
