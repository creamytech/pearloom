import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Photo Gallery | Pearloom',
  description: 'Browse and share photos from your celebration.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
