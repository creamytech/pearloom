import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Settings | Pearloom',
  description: 'Manage your profile, plan, billing, and account settings.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
