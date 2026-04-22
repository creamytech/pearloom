export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { DashShell } from '@/components/marketing/v2/DashShell';
import { DayOfV2 } from '@/components/marketing/v2/DayOfV2';

export const metadata: Metadata = {
  title: 'Day-of room | Pearloom',
  description: "One source of truth for everyone running today's event.",
};

export default function DayOfPage() {
  return (
    <DashShell>
      <DayOfV2 />
    </DashShell>
  );
}
