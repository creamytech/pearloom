import type { Metadata } from 'next';
import { MarketplaceV8 } from '@/components/pearloom/marketplace/MarketplaceV8';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Marketplace · Pearloom',
  description:
    'Start from a story that feels like yours. Beautiful templates for weddings, anniversaries, birthdays, memorials, reunions, and more.',
};

export default function MarketplacePage() {
  return <MarketplaceV8 />;
}
