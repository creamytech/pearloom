'use client';

// Visual harness for the home cockpit pieces. Sample props mirror
// the design-system prototype (Mira & Jun, 84 days) so the render
// can be compared directly against the target screenshot.

import { CountdownHero, StatTiles, type StatTileData } from '@/components/pearloom/dash/cockpit';

const TILES: StatTileData[] = [
  { key: 'coming', label: 'Coming', value: 38, sub: 'of 64 invited', color: 'var(--sage-deep)', icon: 'users' },
  { key: 'await', label: 'Awaiting reply', value: 21, sub: 'no reply yet', color: 'var(--peach-ink)', icon: 'clock' },
  { key: 'replied', label: 'Replied', value: 43, sub: 'of 64 · 67%', color: 'var(--gold)', icon: 'check', bar: 67 },
  { key: 'days', label: 'Days to go', value: 84, sub: 'Sept 6, 2026', color: 'var(--lavender-ink)', icon: 'calendar' },
];

export function DevDashboardClient() {
  return (
    <div className="pl8" style={{ minHeight: '100dvh', background: 'var(--cream)', padding: '32px clamp(16px,4vw,40px) 64px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CountdownHero
          greeting="Good evening, Scott"
          names={['Mira', 'Jun']}
          eyebrow="A bright Saturday in Point Reyes"
          daysUntil={84}
          dateLabel="Saturday, September 6, 2026"
          decisions={4}
          tasksLeft={3}
          liveHref="#"
          editorHref="#"
          askHref="#"
        />
        <StatTiles tiles={TILES} />
      </div>
    </div>
  );
}
