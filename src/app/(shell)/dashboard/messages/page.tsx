import type { Metadata } from 'next';
import { DashMessages } from '@/components/marketing/design/dash/DashMessages';

export const metadata: Metadata = {
  title: 'Messages | Pearloom',
  description: 'The guest thread and your direct lines, in one place.',
};

export default function MessagesPage() {
  return <DashMessages />;
}
