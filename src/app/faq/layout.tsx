import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ | Pearloom',
  description: 'Frequently asked questions about your event.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
