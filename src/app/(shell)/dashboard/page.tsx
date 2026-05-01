import type { Metadata } from 'next';
import { WelcomeHome } from '@/components/pearloom/pages/WelcomeHome';

export const metadata: Metadata = {
  title: 'Dashboard · Pearloom',
  description: 'Today, in your hands.',
};

export default function DashboardPage() {
  return <WelcomeHome />;
}
