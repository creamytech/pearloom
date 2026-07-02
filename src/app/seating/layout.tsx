import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seating Chart | Pearloom',
  description: 'Design and manage your event seating arrangement.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
