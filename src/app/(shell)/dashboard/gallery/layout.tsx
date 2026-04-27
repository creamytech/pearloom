import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Photo Gallery | Pearloom',
  description: 'Browse and manage all your celebration photos.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
