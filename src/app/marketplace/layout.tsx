import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace | Pearloom',
  description: 'Browse, search, and discover community celebration templates.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
