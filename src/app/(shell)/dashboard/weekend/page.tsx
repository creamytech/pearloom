import type { Metadata } from 'next';
import { WeekendBuilderPage } from '@/components/pearloom/pages/WeekendBuilderPage';

export const metadata: Metadata = {
  title: 'Weekend builder · Pearloom',
  description: 'Plan a whole celebration weekend — bachelor, rehearsal, welcome, wedding, brunch. Pear creates each as a linked site.',
};

export default function Page() {
  return <WeekendBuilderPage />;
}
