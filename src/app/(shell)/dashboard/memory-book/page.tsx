export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { MemoryBookPage } from '@/components/pearloom/pages/MemoryBookPage';

export const metadata: Metadata = {
  title: 'Memory book · Pearloom',
  description: 'Every chapter, memory, whisper, and time-capsule note — printable as a keepsake.',
};

export default function Page() {
  return <MemoryBookPage />;
}
