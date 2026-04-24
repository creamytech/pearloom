import type { Metadata } from 'next';
import { MarketplaceV8 } from '@/components/pearloom/marketplace/MarketplaceV8';

export const metadata: Metadata = {
  title: 'Templates · Pearloom',
  description:
    'Every template is a full site — pages, flow, tone, and type — ready for your people, photos, and moments.',
};

export default function TemplatesPage() {
  return <MarketplaceV8 />;
}
