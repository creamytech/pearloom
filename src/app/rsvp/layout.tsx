import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RSVP | Pearloom',
  description: 'Respond to your event invitation.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
