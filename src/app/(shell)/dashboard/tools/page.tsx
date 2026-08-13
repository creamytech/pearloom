import type { Metadata } from 'next';
import { MoreToolsPage } from '@/components/pearloom/pages/MoreToolsPage';

export const metadata: Metadata = {
  title: 'More tools · Pearloom',
  description: 'Every Pearloom dashboard tool in one place.',
};

export default function Page() {
  return <MoreToolsPage />;
}
