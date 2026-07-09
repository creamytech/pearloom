'use client';

// Visual harness for the home cockpit pieces. Sample props mirror
// the editorial "cockpit" design (Mira & Jun) so the render can be
// compared directly against the target screens. It exercises the
// full top-to-bottom layout the real Home (WelcomeHome) composes —
// in ALL FOUR WORLDS: the phase switcher below (planning / the day
// / afterglow / kept) is the AFTERGLOW-PLAN §5 guardrail. The
// missing post-event harness state is why the planning-tense
// dashboard shipped wrong; every future visual pass sees each
// phase with one click.

import { useState } from 'react';
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
  type WeekendEventItem,
  type WeekendAdd,
  type NeedRow,
  type LatelyItem,
  type BudgetLine,
} from '@/components/pearloom/dash/cockpit';
import { getTheme, themeRootStyle } from '@/components/pearloom/site/themes';
import { useIsMobile } from '@/components/pearloom/redesign/use-nav-hooks';
import { cockpitPhaseFor, phaseCopyFor, postEventEyebrowFor, type CockpitPhase } from '@/lib/event-os/cockpit-phase';
import { buildChecklist } from '@/components/pearloom/pages/welcome-home-copy';

type World = 'planning' | 'the-day' | 'afterglow' | 'kept';

const WORLDS: Array<{ id: World; label: string; daysUntil: number }> = [
  { id: 'planning', label: 'Planning · +84d', daysUntil: 84 },
  { id: 'the-day', label: 'The day · 0d', daysUntil: 0 },
  { id: 'afterglow', label: 'Afterglow · −11d', daysUntil: -11 },
  { id: 'kept', label: 'Kept · −120d', daysUntil: -120 },
];

function eventDateFor(daysUntil: number, base: number): Date {
  const d = new Date(base + daysUntil * 86_400_000);
  d.setHours(16, 30, 0, 0);
  return d;
}

const QUICK_PLAN: QuickActionItem[] = [
  { icon: 'check', label: 'Add a task', color: 'var(--sage-deep)', href: '#' },
  { icon: 'users', label: 'Invite guests', color: 'var(--peach-ink)', href: '#' },
  { icon: 'layout', label: 'Edit site', color: 'var(--lavender-ink)', href: '#' },
  { icon: 'sparkles', label: 'Studio', color: 'var(--pl-gold)', href: '#' },
];
const QUICK_AFTERGLOW: QuickActionItem[] = [
  { icon: 'bookmark', label: 'Memory book', color: 'var(--sage-deep)', href: '#' },
  { icon: 'gift', label: 'Thank-yous', color: 'var(--peach-ink)', href: '#' },
  { icon: 'image', label: 'The Reel', color: 'var(--lavender-ink)', href: '#' },
  { icon: 'sparkles', label: 'Share the keepsake', color: 'var(--pl-gold)', href: '#' },
];

const ROAD_PLAN: RoadMilestone[] = [
  { date: '', label: 'Venue booked', sub: 'Completed · Oct 15, 2025', state: 'done' },
  { date: '', label: 'Save the date', sub: 'Completed · May 12, 2026', state: 'done' },
  { date: '', label: 'Formal invitation', sub: 'Due in 7 days · May 27', state: 'now', tag: 'Due in 7 days' },
  { date: '', label: 'RSVP reminder', sub: 'Jun 3, 2026', state: 'next' },
  { date: '', label: 'Final RSVP nudge', sub: 'Jun 10, 2026', state: 'next' },
  { date: '', label: 'The big day', sub: 'Sept 6, 2026', state: 'end' },
];
const ROAD_STORY: RoadMilestone[] = [
  { date: 'Mar 2', label: 'Site pressed', sub: 'where the thread began', state: 'done', tag: 'Mar 2' },
  { date: 'Mar 9', label: 'Shared with your people', sub: '', state: 'done', tag: 'Mar 9' },
  { date: 'Done', label: '74 said yes', sub: 'of 96 invited', state: 'done' },
  { date: 'Jun 27, 2026', label: 'The big day', sub: '11 days ago', state: 'end', tag: 'Jun 27, 2026' },
];

const WEEKEND: WeekendEventItem[] = [
  { day: 'FRI · SEP 4', title: 'Welcome Drinks', meta: '7:00 – 9:30 PM · The Roof', rsvp: 'Yes', color: 'var(--sage)', href: '#' },
  { day: 'SAT · SEP 5', title: 'Rehearsal Dinner', meta: '6:30 – 9:00 PM · Osteria Stellina', rsvp: 'Yes', color: 'var(--pl-gold)', href: '#' },
  { day: 'SUN · SEP 6', title: 'The Big Day', meta: '4:30 – 11:30 PM · Lark Hill Farm', rsvp: 'Host', color: 'var(--lavender-ink)', href: '#' },
];
const WEEKEND_ADDS: WeekendAdd[] = [
  { label: 'Morning-after brunch', blurb: 'On the main site’s schedule, or its own.', href: '#' },
];
const WEEKEND_ADDS_KEPT: WeekendAdd[] = [
  { label: 'The anniversary edition', blurb: 'One year on, the story, one chapter longer.', href: '#' },
];

const NEEDS_PLAN: NeedRow[] = [
  { title: '3 guest photos are waiting for the wall', sub: 'The Reel · Pear can approve', cta: 'Review', href: '#', urgency: 'now' },
  { title: '2 parties opened the invite but never replied', sub: 'Guests · Pear can draft the nudge', cta: 'Nudge', href: '#', urgency: 'soon' },
  { title: 'First-dance song is still open', sub: 'Studio', cta: 'Pick', href: '#', urgency: 'later' },
];
const NEEDS_AFTERGLOW: NeedRow[] = [
  { title: '12 photos await your nod', sub: 'Guests added to the reel, approve the keepers.', cta: 'Review', href: '#', urgency: 'now' },
  { title: 'Thank-yous, 9 of 31 sent', sub: 'The gift ledger keeps score. Pear drafts each note.', cta: 'Open the ledger', href: '#', urgency: 'soon' },
  { title: 'The memory book is ready to share', sub: '31 notes from your people, already woven in.', cta: 'Open it', href: '#', urgency: 'later' },
];

const LATELY: LatelyItem[] = [
  { name: 'Amara', action: 'said yes, +1 Theo', when: '2h', tone: 'yes' },
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
  const [world, setWorld] = useState<World>('planning');
  // Lazy init — no Date.now() in render (React Compiler rule).
  const [baseNow] = useState(() => Date.now());
  const twoCol = (a: string, b: string) => (narrow ? '1fr' : `${a} ${b}`);

  const spec = WORLDS.find((w) => w.id === world)!;
  const phase: CockpitPhase = cockpitPhaseFor(spec.daysUntil);
  const post = phase === 'afterglow' || phase === 'kept';
  const copy = phaseCopyFor(phase, 'celebratory', 'mid');
  const eventDate = eventDateFor(spec.daysUntil, baseNow);
  const dateLabel = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const dateShort = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const checklist = buildChecklist(phase, false, { vendorBalancesOpen: true });

  return (
    <div className="pl8" style={{ minHeight: '100dvh', background: 'var(--cream)', padding: '32px clamp(16px,4vw,40px) 64px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* The phase switcher — all four worlds, one click each. */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {WORLDS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWorld(w.id)}
              className="btn btn-sm"
              style={{
                borderRadius: 999,
                border: `1px solid ${world === w.id ? 'var(--pl-olive, #5C6B3F)' : 'var(--line)'}`,
                background: world === w.id ? 'var(--pl-olive, #5C6B3F)' : 'transparent',
                color: world === w.id ? 'var(--cream, #F5EFE2)' : 'var(--ink-soft)',
                fontWeight: 700,
              }}
            >
              {w.label}
            </button>
          ))}
        </div>

        <CockpitGreeting
          eyebrow="Good morning, Mira"
          title={copy.headerTitle}
          titleItalic={copy.headerItalic}
          subtitle={`${dateShort} · Lark Hill Farm. ${phase === 'kept'
            ? 'The day, kept. Everything your people left is here whenever you want it.'
            : post
              ? 'Everything from the day, gathered, and the few threads left to tie.'
              : 'Everything Pear is holding for you, and the few things that want a moment this week.'}`}
        />
        <HeroBanner
          names={['Mira', 'Jun']}
          occasion="wedding"
          eventDate={eventDate}
          dateLabel={dateLabel}
          venueLabel="Lark Hill Farm · Point Reyes, California"
          coverPhoto={null}
          liveHref="#"
          editorHref="#"
          narrow={heroNarrow}
          afterglowStats={post ? { celebrated: 74, photos: 212, notes: 31 } : null}
        />
        <div style={{ display: 'grid', gridTemplateColumns: post ? '1fr' : twoCol('1.1fr', '1fr'), gap: 18, alignItems: 'start' }}>
          {!post && <ProgressCard pct={68} done={31} prog={12} todo={12} />}
          <QuickActions actions={post ? QUICK_AFTERGLOW : QUICK_PLAN} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: phase === 'kept' ? '1fr' : twoCol('1fr', '1fr'), gap: 18, alignItems: 'start' }}>
          {phase !== 'kept' && (
            <RoadCard
              milestones={post ? ROAD_STORY : ROAD_PLAN}
              dateShort={dateShort}
              href={post ? undefined : '#'}
              eyebrow={post ? 'The road you took' : undefined}
              headline={post ? <>How it <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>came together.</span></> : undefined}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <ChecklistCard
              items={checklist}
              href="#"
              eyebrow={phase === 'afterglow' ? 'After the day' : undefined}
              headline={phase === 'afterglow' ? <>Gently, <span style={{ fontStyle: 'italic', color: 'var(--sage-deep)' }}>in your own time.</span></> : undefined}
              linkLabel={phase === 'afterglow' ? 'Open the gift ledger' : undefined}
            />
            <HomeSitePreview
              names={['Mira', 'Jun']}
              dateLabel={dateShort}
              locationLabel="Point Reyes"
              themeName={getTheme('santorini').name}
              rootStyle={themeRootStyle(getTheme('santorini'), 'comfortable')}
              eyebrow={phase === 'the-day' ? 'Today' : post ? postEventEyebrowFor('wedding') : 'Save the date'}
              liveHref="#"
              editorHref="#"
              themeHref="#"
            />
          </div>
        </div>
        {phase !== 'kept' && (
          <div style={{ display: 'grid', gridTemplateColumns: twoCol('1.25fr', '1fr'), gap: 18, alignItems: 'start' }}>
            <NeedsYouNow
              rows={post ? NEEDS_AFTERGLOW : NEEDS_PLAN}
              phaseLabel={copy.label}
              phaseNote={post ? '11 days ago' : phase === 'the-day' ? 'today' : '84 days out'}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {!post && <BudgetBreakdown lines={BUDGET} onSave={() => {}} />}
              <Lately items={LATELY} />
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: post ? twoCol('1.25fr', '1fr') : twoCol('1fr', '1fr'), gap: 18, alignItems: 'start' }}>
          {post ? (
            <>
              <MemoryCard
                images={[]}
                href="#"
                expanded
                moreCount={206}
                blurb="212 photographs and 31 notes from your people, woven in. It grows as more arrives."
              />
              <GuestSummaryCard counts={{ invited: 96, yes: 74, no: 12, maybe: 2, pending: 8 }} href="#" mode="recap" />
            </>
          ) : (
            <>
              <GuestSummaryCard counts={{ invited: 64, yes: 48, no: 10, maybe: 0, pending: 6 }} href="#" />
              <MemoryCard images={[]} href="#" />
            </>
          )}
        </div>
        {phase !== 'afterglow' && (
          <WeekendCard
            events={post ? [] : WEEKEND}
            adds={phase === 'kept' ? WEEKEND_ADDS_KEPT : WEEKEND_ADDS}
            addHref="#"
            manageHref={post ? undefined : '#'}
          />
        )}
        <TheLongView
          dateShort={dateShort}
          phase={phase}
          daysSince={post ? -spec.daysUntil : null}
        />
        <CockpitBlessing text={copy.blessing} />
      </div>
    </div>
  );
}
