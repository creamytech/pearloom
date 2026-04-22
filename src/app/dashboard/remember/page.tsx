export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { DashShell } from '@/components/marketing/v2/DashShell';
import { RememberV2 } from '@/components/marketing/v2/RememberV2';

export const metadata: Metadata = {
  title: 'Remember | Pearloom',
  description: 'Relive the day — highlight reel, voice toasts, photos, and keepsakes.',
};

export default function RememberPage() {
  return (
    <DashShell>
      <RememberV2 />
    </DashShell>
  );
}
