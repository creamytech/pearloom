import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Venue | Pearloom',
  description: 'Search and configure your event venue details.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
