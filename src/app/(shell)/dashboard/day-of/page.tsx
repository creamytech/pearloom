import type { Metadata } from 'next';
import { DayOfV8 } from '@/components/pearloom/pages/DayOfV8';

export const metadata: Metadata = {
  title: 'Day-of room · Pearloom',
  description: "One source of truth for everyone running today's event.",
};

export default function DayOfPage() {
  return <DayOfV8 />;
}
