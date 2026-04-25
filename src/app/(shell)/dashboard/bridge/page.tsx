export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { BridgePage } from '@/components/pearloom/pages/BridgePage';

export const metadata: Metadata = {
  title: 'Guest bridge · Pearloom',
  description: 'Every thread between you and your guests — memory prompts, whispers, song requests, SMS drafts.',
};

export default function Page() {
  return <BridgePage />;
}
