import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner Portal | Pearloom',
  description: 'Register and manage your Pearloom partner account.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
