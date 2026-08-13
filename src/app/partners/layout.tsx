import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partners · Pearloom',
  description: 'A partner program for wedding professionals, in the making.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
