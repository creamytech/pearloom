'use client';

// Dev harness — mounts the REAL ThresholdClient with a seeded desk
// so the login threshold can be styled/verified without a DB.
// Not linked from any nav; dev-only like the other /dev pages.

import { ThresholdClient, type ThresholdCard } from '@/app/threshold/ThresholdClient';

const CARDS: ThresholdCard[] = [
  {
    id: 'demo-wedding',
    title: 'Shauna & Scott',
    initial: 'S',
    occasion: 'wedding',
    occasionLabel: 'Wedding',
    dateLabel: 'Apr 17, 2026',
    phaseLine: '283 days to go',
    coverPhoto: null,
    guests: 128,
    shared: false,
  },
  {
    id: 'demo-reunion',
    title: 'The Calloway Reunion',
    initial: 'C',
    occasion: 'reunion',
    occasionLabel: 'Reunion',
    dateLabel: 'Aug 8, 2026',
    phaseLine: '396 days to go',
    coverPhoto: null,
    guests: 32,
    shared: false,
  },
  {
    id: 'demo-birthday',
    title: 'Mom’s 60th',
    initial: 'M',
    occasion: 'milestone-birthday',
    occasionLabel: 'Milestone birthday',
    dateLabel: 'Nov 2, 2025',
    phaseLine: 'The afterglow',
    coverPhoto: null,
    guests: 45,
    shared: false,
  },
  {
    id: 'demo-shower',
    title: 'Priya’s Shower',
    initial: 'P',
    occasion: 'baby-shower',
    occasionLabel: 'Baby shower',
    dateLabel: 'Jan 12, 2026',
    phaseLine: '14 days to go',
    coverPhoto: null,
    guests: 14,
    shared: true,
  },
];

export default function DevThresholdPage() {
  return <ThresholdClient cards={CARDS} firstName="Scott" />;
}
