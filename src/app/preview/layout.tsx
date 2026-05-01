import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preview | Pearloom',
  description: 'Preview your celebration site before publishing.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
