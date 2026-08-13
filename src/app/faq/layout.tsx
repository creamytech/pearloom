import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ · Pearloom',
  description: 'Answers to the questions hosts and guests ask most, sites, invitations, RSVPs, and the day itself.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
