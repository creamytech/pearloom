import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'See a Pearloom site, fully woven · Pearloom demo',
  description:
    'Walk through a real Pearloom celebration site (the sealed arrival, the story, the schedule, the RSVP) exactly as your guests would.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
