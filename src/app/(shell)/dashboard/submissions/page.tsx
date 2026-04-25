export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { DashSubmissions } from '@/components/marketing/design/dash/DashSubmissions';

export const metadata: Metadata = {
  title: 'Submissions | Pearloom',
  description: 'Guest photos, toasts, and song requests, ready for moderation.',
};

export default function SubmissionsPage() {
  return <DashSubmissions />;
}
