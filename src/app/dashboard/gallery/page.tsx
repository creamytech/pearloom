export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { DashGallery } from '@/components/marketing/design/dash/DashGallery';

export const metadata: Metadata = {
  title: 'The Reel | Pearloom',
  description: 'Every photograph across every site you’ve made.',
};

export default function GalleryPage() {
  return <DashGallery />;
}
