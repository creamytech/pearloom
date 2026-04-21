import type { Metadata } from 'next';
import { DashDayOf } from '@/components/marketing/design/dash/DashDayOf';

export const metadata: Metadata = {
  title: 'Day-of room | Pearloom',
  description: "One source of truth for everyone running today's event.",
};

export default function DayOfPage() {
  return <DashDayOf />;
}
