import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guest RSVPs | Pearloom',
  description: 'View and manage all guest RSVPs for your event.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
