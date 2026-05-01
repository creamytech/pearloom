import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Event Details | Pearloom',
  description: 'View all the details for your upcoming event.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
