'use client';

// Visual harness for the home cockpit pieces. Sample props mirror
// the design-system prototype (Mira & Jun, 84 days) so the render
// can be compared directly against the target screenshot.

import {
  CockpitHeader,
  CountdownHero,
  StatTiles,
  NeedsYouNow,
  Lately,
  TheLongView,
  type StatTileData,
  type NeedRow,
  type LatelyItem,
} from '@/components/pearloom/dash/cockpit';

const TILES: StatTileData[] = [
  { key: 'coming', label: 'Coming', value: 38, sub: 'of 64 invited', color: 'var(--sage-deep)', icon: 'users' },
  { key: 'await', label: 'Awaiting reply', value: 21, sub: 'no reply yet', color: 'var(--peach-ink)', icon: 'clock' },
  { key: 'replied', label: 'Replied', value: 43, sub: 'of 64 · 67%', color: 'var(--gold)', icon: 'check', bar: 67 },
  { key: 'days', label: 'Days to go', value: 84, sub: 'Sept 6, 2026', color: 'var(--lavender-ink)', icon: 'calendar' },
];

const NEEDS: NeedRow[] = [
  { title: '3 guest photos are waiting for the wall', sub: 'The Reel · Pear can approve', cta: 'Review', href: '#', urgency: 'now' },
  { title: '2 parties opened the invite but never replied', sub: 'Guests · Pear can draft the nudge', cta: 'Nudge', href: '#', urgency: 'soon' },
  { title: 'First-dance song is still open', sub: 'Studio', cta: 'Pick', href: '#', urgency: 'later' },
];

const LATELY: LatelyItem[] = [
  { name: 'Amara', action: 'said yes — +1 Theo', when: '2h', tone: 'yes' },
  { name: 'Jun', action: 'confirmed the florist', when: '4h', tone: 'yes' },
  { name: 'Priya', action: 'declined', when: 'yesterday', tone: 'no' },
];

export function DevDashboardClient() {
  return (
    <div className="pl8" style={{ minHeight: '100dvh', background: 'var(--cream)', padding: '32px clamp(16px,4vw,40px) 64px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CockpitHeader greeting="Good evening, Scott" subtitle="Mid-planning. Replies are landing. Keep the schedule moving." />
        <CountdownHero
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16, alignItems: 'start' }}>
          <NeedsYouNow rows={NEEDS} phaseLabel="Planning" phaseNote="84 days out" />
          <Lately items={LATELY} />
        </div>
        <TheLongView dateShort="Sept 6, 2026" />
      </div>
    </div>
  );
}
