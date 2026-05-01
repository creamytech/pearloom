import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo | Pearloom',
  description: 'See a live demo of a Pearloom celebration site.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
