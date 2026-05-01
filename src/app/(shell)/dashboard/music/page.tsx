import type { Metadata } from 'next';
import { MusicDashboardClient } from './MusicDashboardClient';

export const metadata: Metadata = {
  title: 'Music · Pearloom',
  description: 'Triage the collaborative playlist — accept the songs you love, hide the ones you don\'t.',
};

export default function MusicPage() {
  return <MusicDashboardClient />;
}
