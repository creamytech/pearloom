export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { DashMarketplace } from '@/components/marketing/design/dash/DashMarketplace';

export const metadata: Metadata = {
  title: 'Marketplace | Pearloom',
  description: "Vendors Pear trusts — only those who've done three or more Pearloom events.",
};

export default function MarketplacePage() {
  return <DashMarketplace />;
}
