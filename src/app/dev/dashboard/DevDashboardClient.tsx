'use client';

// Visual harness for the home cockpit pieces. Sample props mirror
// the editorial "cockpit" design (Mira & Jun) so the render can be
// compared directly against the target screens. It exercises the
// full top-to-bottom layout the real Home (WelcomeHome) composes.

import {
  CockpitGreeting,
  HeroBanner,
  ProgressCard,
  QuickActions,
  RoadCard,
  ChecklistCard,
  GuestSummaryCard,
  MemoryCard,
  WeekendCard,
  NeedsYouNow,
  Lately,
  TheLongView,
  HomeSitePreview,
  BudgetBreakdown,
  CockpitBlessing,
  type QuickActionItem,
  type RoadMilestone,
  type ChecklistItem,
  type WeekendEventItem,
  type WeekendAdd,
  type NeedRow,
  type LatelyItem,
  type BudgetLine,
} from '@/components/pearloom/dash/cockpit';
import { getTheme, themeRootStyle } from '@/components/pearloom/site/themes';
import { useIsMobile } from '@/components/pearloom/redesign/use-nav-hooks';

// A fixed future date so the hero countdown actually ticks.
const EVENT_DATE = new Date('2026-09-06T16:30:00');

const QUICK: QuickActionItem[] = [
  { icon: 'check', label: 'Add a task', color: 'var(--sage-deep)', href: '#' },
  { icon: 'users', label: 'Invite guests', color: 'var(--peach-ink)', href: '#' },
  { icon: 'layout', label: 'Edit site', color: 'var(--lavender-ink)', href: '#' },
  { icon: 'sparkles', label: 'Studio', color: 'var(--pl-gold)', href: '#' },
];

const ROAD: RoadMilestone[] = [
  { date: '', label: 'Venue booked', sub: 'Completed · Oct 15, 2025', state: 'done' },
  { date: '', label: 'Save the date', sub: 'Completed · May 12, 2026', state: 'done' },
  { date: '', label: 'Formal invitation', sub: 'Due in 7 days · May 27', state: 'now', tag: 'Due in 7 days' },
  { date: '', label: 'RSVP reminder', sub: 'Jun 3, 2026', state: 'next' },
  { date: '', label: 'Final RSVP nudge', sub: 'Jun 10, 2026', state: 'next' },
  { date: '', label: 'The big day', sub: 'Sept 6, 2026', state: 'end' },
];

const CHECK: ChecklistItem[] = [
  { t: 'Confirm vendor arrival times', p: 'High' },
  { t: 'Share the final timeline', p: 'High' },
  { t: 'Check seating & place cards', p: 'Medium' },
  { t: 'Pack welcome gifts', p: 'Medium' },
  { t: 'Print menus & signage', p: 'Low' },
];

const WEEKEND: WeekendEventItem[] = [
  { day: 'FRI · SEP 4', title: 'Welcome Drinks', meta: '7:00 – 9:30 PM · The Roof', rsvp: 'Yes', color: 'var(--sage)', href: '#' },
  { day: 'SAT · SEP 5', title: 'Rehearsal Dinner', meta: '6:30 – 9:00 PM · Osteria Stellina', rsvp: 'Yes', color: 'var(--pl-gold)', href: '#' },
  { day: 'SUN · SEP 6', title: 'The Big Day', meta: '4:30 – 11:30 PM · Lark Hill Farm', rsvp: 'Host', color: 'var(--lavender-ink)', href: '#' },
];

const WEEKEND_ADDS: WeekendAdd[] = [
  { label: 'Morning-after brunch', blurb: 'Its own site, woven to match.', href: '#' },
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

const BUDGET: BudgetLine[] = [
  { cat: 'Venue', used: 14000, cap: 14000 },
  { cat: 'Catering', used: 11000, cap: 13000 },
  { cat: 'Florals', used: 4400, cap: 4000 },
  { cat: 'Music & sound', used: 3000, cap: 3500 },
];

export function DevDashboardClient() {
  const narrow = useIsMobile(920);
  const heroNarrow = useIsMobile(760);
  const twoCol = (a: string, b: string) => (narrow ? '1fr' : `${a} ${b}`);
  return (
    <div className="pl8" style={{ minHeight: '100dvh', background: 'var(--cream)', padding: '32px clamp(16px,4vw,40px) 64px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <CockpitGreeting
          eyebrow="Good morning, Mira"
          subtitle="Sept 6, 2026 · Lark Hill Farm. Everything Pear is holding for you, and the few things that want a moment this week."
        />
        <HeroBanner
          names={['Mira', 'Jun']}
          occasion="wedding"
          eventDate={EVENT_DATE}
          dateLabel="Saturday, September 6, 2026"
          venueLabel="Lark Hill Farm · Point Reyes, California"
          coverPhoto={null}
          liveHref="#"
          editorHref="#"
          narrow={heroNarrow}
        />
        <div style={{ display: 'grid', gridTemplateColumns: twoCol('1.1fr', '1fr'), gap: 18, alignItems: 'start' }}>
          <ProgressCard pct={68} done={31} prog={12} todo={12} />
          <QuickActions actions={QUICK} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: twoCol('1fr', '1fr'), gap: 18, alignItems: 'start' }}>
          <RoadCard milestones={ROAD} dateShort="Sept 6" href="#" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <ChecklistCard items={CHECK} href="#" />
            <HomeSitePreview
              names={['Mira', 'Jun']}
              dateLabel="Sept 6"
              locationLabel="Point Reyes"
              themeName={getTheme('santorini').name}
              rootStyle={themeRootStyle(getTheme('santorini'), 'comfortable')}
              liveHref="#"
              editorHref="#"
              themeHref="#"
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: twoCol('1.25fr', '1fr'), gap: 18, alignItems: 'start' }}>
          <NeedsYouNow rows={NEEDS} phaseLabel="Planning" phaseNote="84 days out" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <BudgetBreakdown lines={BUDGET} onSave={() => {}} />
            <Lately items={LATELY} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: twoCol('1fr', '1fr'), gap: 18, alignItems: 'start' }}>
          <GuestSummaryCard counts={{ invited: 64, yes: 48, no: 10, maybe: 0, pending: 6 }} href="#" />
          <MemoryCard images={[]} href="#" />
        </div>
        <WeekendCard events={WEEKEND} adds={WEEKEND_ADDS} addHref="#" manageHref="#" />
        <TheLongView dateShort="Sept 6, 2026" />
        <CockpitBlessing />
      </div>
    </div>
  );
}
