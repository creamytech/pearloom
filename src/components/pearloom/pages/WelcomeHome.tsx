'use client';

// ─────────────────────────────────────────────────────────────
// WelcomeHome — the dashboard "Welcome back" home page.
//
// Six blocks, top to bottom:
//
//   1. HeroBand    — couple names + days-until + stage pill +
//                    next-milestone callout + planning progress
//   2. QuickJumps  — 4 stage-aware tiles (early / mid / late) so
//                    the most useful next action sits up front
//   3. Pear todos  — Pear's 3 "worth your minute" recommendations,
//                    derived from /api/guests/intelligence
//   4. ActivityFeed — recent RSVPs + Pear actions on a timeline
//   5. GuestPulse  — % responded + stacked yes/no/maybe/pending bar
//   6. Milestones  — vertical roadmap to the date with done/urgent/
//                    next/upcoming dot states
//
// Data flow:
//   - useSelectedSite() drives the active site
//   - GET /api/guests?siteId= drives GuestPulse + ActivityFeed
//   - GET /api/guests/intelligence drives Pear's recommendations
//   - Stage (early | mid | late) derives from daysUntil — anything
//     under 30 days is "late", over 180 is "early", everything in
//     between is "mid". The QuickJumps + Milestones change shape
//     based on stage so the page is contextual, not a static slab.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashLayout } from '../dash/DashShell';
import { Icon, Pear } from '../motifs';
import { useIsMobile } from '../redesign/use-nav-hooks';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { parseLocalDate } from '@/lib/date-utils';
import { buildSiteUrl, formatSiteDisplayUrl } from '@/lib/site-urls';
import { nextStepFor, rsvpMomentumFor, type NextStep, type RsvpMomentum } from '@/lib/next-step';
import type { StoryManifest } from '@/types';
import type { GuestInsight } from '@/app/api/guests/intelligence/route';

interface Guest {
  id: string;
  name: string;
  status: 'pending' | 'yes' | 'no' | 'maybe' | string;
  respondedAt?: string | null;
  message?: string | null;
  plusOneName?: string | null;
}

/** The slice of /api/cadence's MergedPhase the milestones read. */
interface CadencePhaseLite {
  label: string;
  scheduledAt: string;
  status: 'preset' | 'draft' | 'scheduled' | 'sent' | 'cancelled' | 'failed';
  sentCount?: number;
}

type Stage = 'early' | 'mid' | 'late';

function stageFromDaysUntil(daysUntil: number | null): Stage {
  if (daysUntil == null) return 'early';
  if (daysUntil <= 30) return 'late';
  if (daysUntil >= 180) return 'early';
  return 'mid';
}

// ─────────────────────────────────────────────────────────────
// WelcomeHome
// ─────────────────────────────────────────────────────────────
export function WelcomeHome() {
  const { site, sites } = useSelectedSite();
  const { data: session } = useSession();
  const [insights, setInsights] = useState<GuestInsight[] | null>(null);
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [cadence, setCadence] = useState<CadencePhaseLite[] | null>(null);

  useEffect(() => {
    if (!site?.domain) return;
    let cancelled = false;
    fetch(`/api/guests/intelligence?siteId=${encodeURIComponent(site.domain)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { insights?: GuestInsight[] } | null) => {
        if (!cancelled && data?.insights) setInsights(data.insights);
      })
      .catch(() => {});
    fetch(`/api/cadence?site=${encodeURIComponent(site.domain)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { phases?: CadencePhaseLite[] } | null) => {
        if (!cancelled) setCadence(data?.phases ?? null);
      })
      .catch(() => { if (!cancelled) setCadence(null); });
    fetch(`/api/guests?site=${encodeURIComponent(site.domain)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { guests?: Guest[] } | null) => {
        if (!cancelled) setGuests(data?.guests ?? []);
      })
      .catch(() => {
        // Keyless deploy / API error — resolve to empty so the
        // Guests card shows its real empty state instead of an
        // eternal 'Threading…' strip.
        if (!cancelled) setGuests([]);
      });
    return () => { cancelled = true; };
  }, [site?.domain]);

  // ── Derived: dates, stage, names ────────────────────────────
  const eventDate = parseLocalDate(site?.eventDate);
  // `now` ticks hourly so the days-until count advances at
  // midnight without a page reload. Lazy init keeps render pure.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  /* rawDaysUntil goes negative after the event — the post-event
     cards key off it. (The old `daysUntil < 0` checks could never
     fire because of the Math.max clamp; the RememberingCard had
     been dead code since it shipped.) `daysUntil` stays clamped
     for the countdown/stage math that expects ≥ 0. */
  const rawDaysUntil = eventDate
    ? Math.round((eventDate.getTime() - now) / 86_400_000)
    : null;
  const daysUntil = rawDaysUntil != null ? Math.max(0, rawDaysUntil) : null;
  const eventDateLabel = eventDate
    ? eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const eventDateShort = eventDate
    ? eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const stage = stageFromDaysUntil(daysUntil);
  const namesArr = (site?.names ?? []).filter(Boolean) as string[];
  // Greet by the celebration's honoree name; before a site exists,
  // fall back to the signed-in user's first name, then 'friend'.
  const sessionFirstName = (session?.user?.name ?? '').trim().split(/\s+/)[0] || null;
  // Greet the signed-in HOST (Scott), not the couple's first name —
  // a co-host or solo planner isn't "Shaun". Fall back to the
  // event name only when we don't know the user's name.
  const firstName = sessionFirstName ?? namesArr[0] ?? 'friend';
  /* Time-of-day greeting — set after mount (client local time) so
     SSR can't hydration-mismatch against the server's clock. */
  const [greeting, setGreeting] = useState('Welcome back');
  useEffect(() => {
    /* rAF, not a direct set — the compiler lint flags synchronous
       setState in effects (cascading-render risk). */
    const id = requestAnimationFrame(() => {
      const h = new Date().getHours();
      setGreeting(h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const occasion = site?.occasion ?? 'wedding';
  /* Work-zone breakpoint — inline (see the grid comment below). */
  const workZoneNarrow = useIsMobile(920);
  const editorHref = site?.domain ? `/editor/${site.domain}` : '/dashboard/event';
  const liveHref = site?.domain ? buildSiteUrl(site.domain, '', undefined, occasion) : '#';
  const liveDisplay = site?.domain ? formatSiteDisplayUrl(site.domain, '', occasion) : '';

  // ── Guest counts ────────────────────────────────────────────
  const guestCounts = useMemo(() => {
    if (!guests) return null;
    let yes = 0, no = 0, maybe = 0, pending = 0;
    for (const g of guests) {
      if (g.status === 'yes' || g.status === 'attending') yes++;
      else if (g.status === 'no' || g.status === 'declined') no++;
      else if (g.status === 'maybe') maybe++;
      else pending++;
    }
    return { invited: guests.length, yes, no, maybe, pending };
  }, [guests]);

  // ── Recent activity (RSVPs ordered by respondedAt desc) ────
  const recentActivity = useMemo(() => {
    if (!guests) return [];
    return guests
      .filter((g) => g.respondedAt && (g.status === 'yes' || g.status === 'no' || g.status === 'maybe'))
      .sort((a, b) => new Date(b.respondedAt!).getTime() - new Date(a.respondedAt!).getTime())
      .slice(0, 7);
  }, [guests]);

  // ── Golden thread — the ONE next-best-action ────────────────
  // Shares src/lib/next-step.ts with the editor's topbar chip so
  // the dashboard and the editor always name the same step.
  // Counts come from the /api/guests fetch this page already does.
  const manifest = (site?.manifest ?? null) as StoryManifest | null;
  const nextStep = useMemo(
    () => (manifest
      ? nextStepFor(
          manifest,
          guestCounts ? { guests: guestCounts.invited, pendingRsvps: guestCounts.pending } : undefined,
          new Date(now),
        )
      : null),
    [manifest, guestCounts, now],
  );
  const nextStepHref = nextStep ? hrefForNextStep(nextStep, editorHref) : null;

  // ── Pear recommendations — after the golden thread so the same
  //    urgent task never renders twice (suppressNudge dedupe). ──
  const pearTodos = usePearTodos({ stage, insights, guestCounts, daysUntil, suppressNudge: nextStep?.id === 'nudge' });

  // ── RSVP momentum — pending replies + reply-by inside 7 days ─
  const rsvpMomentum = useMemo(
    () => (manifest && guestCounts
      ? rsvpMomentumFor(manifest, guestCounts.pending, new Date(now))
      : null),
    [manifest, guestCounts, now],
  );

  // ── Next milestone (drives the hero callout) ────────────────
  const milestones = useMemo(
    () => buildMilestones({ stage, eventDate, eventDateShort, daysUntil, guestCounts, cadence }),
    [stage, eventDate, eventDateShort, daysUntil, guestCounts, cadence],
  );
  const nextMilestone = milestones.find((m) => m.status === 'urgent')
    ?? milestones.find((m) => m.status === 'next')
    ?? milestones.find((m) => m.status === 'upcoming')
    ?? null;

  const stageBlurb =
    stage === 'early' ? 'Just getting started. Pear has a few ideas to get the ball rolling.'
    : stage === 'late' ? 'The home stretch — RSVPs are closing and the day-of room is open.'
    : 'Mid-planning. Replies are landing. Keep the schedule moving.';

  return (
    <DashLayout active="home" title="Welcome back" subtitle={stageBlurb} hideTopbar>
      {/* Slim header — the old 36px "Good evening" display heading
          stacked directly above the HeroBand's 48px name lockup, two
          hero moments competing in the first 300px. The greeting is
          now a quiet mono-caps eyebrow, the bell + avatar join the
          action cluster (Home previously had NEITHER — the most-
          visited page had no notifications and no settings entry),
          and ~90px returns to the fold. */}
      <div
        className="pl8-home-greet"
        style={{
          padding: '20px clamp(20px, 4vw, 40px) 8px',
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--ink-soft)' }}>
          <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold, #C19A4B)' }} />
          {greeting}, {firstName}
        </span>
        {/* The global controls (theme · bell · account) moved to the
            shell's persistent DashUtilityBar — this header keeps only
            the home-specific actions. */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {site?.domain && (
            <a
              href={liveHref}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
              style={{ textDecoration: 'none' }}
            >
              <Icon name="eye" size={13} /> View live
            </a>
          )}
          <Link href={editorHref} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            <Icon name="brush" size={13} color="var(--cream)" /> Open editor
          </Link>
        </div>
      </div>

      {/* Pending co-host invitations addressed to this signed-in
          user — accept right here, no inbox dig required. */}
      <CoHostInviteBanner />

      <div
        style={{
          padding: '0 clamp(20px, 4vw, 40px) 32px',
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <HeroBand
          firstName={firstName}
          namesArr={namesArr}
          eventDateLabel={eventDateLabel}
          venue={site?.venue ?? null}
          daysUntil={daysUntil}
          stage={stage}
          nextMilestone={nextMilestone}
          nextStep={nextStep}
          nextStepHref={nextStepHref}
          hasManifest={manifest != null}
          progressDone={milestones.filter((m) => m.status === 'done').length}
          progressTotal={milestones.length}
          newSinceVisit={recentActivity.length}
          liveDisplay={liveDisplay}
        />

        <QuickJumps stage={stage} editorHref={editorHref} liveHref={liveHref} liveDisplay={liveDisplay} domain={site?.domain ?? null} />

        {/* Two-column work zone — same shape as the design.
            Stacks below 920px so phones get a single column.
            INLINE grid, not styled-jsx: the runtime style injection
            occasionally raced inside ShellPersistentLayout and the
            class resolved to nothing — every card stacked. Inline
            styles can't race; responsiveness rides useIsMobile, the
            same pattern HeroBand documents above. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: workZoneNarrow ? '1fr' : '1.25fr 1fr',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PearRecommendations todos={pearTodos} domain={site?.domain ?? null} />
            <ActivityFeed activity={recentActivity} stage={stage} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ResumeDraftCard />
            {rawDaysUntil != null && rawDaysUntil < 0 && site?.domain && (
              <RememberingCard domain={site.domain} occasion={occasion} daysSince={-rawDaysUntil} />
            )}
            {/* The anniversary window — roughly 320–430 days after a
                couple-arc event, offer the anniversary edition: a new
                sibling site woven into the same celebration, carrying
                the rebroadcast + a year of photographs. */}
            {rawDaysUntil != null
              && rawDaysUntil <= -320
              && rawDaysUntil >= -430
              && (occasion === 'wedding' || occasion === 'vow-renewal' || occasion === 'anniversary')
              && !(sites ?? []).some((s) => s.occasion === 'anniversary' && s.domain !== site?.domain)
              && site?.domain && (
              <AnniversaryCard daysSince={-rawDaysUntil} origin={site} />
            )}
            {/* One urgent task could shout four times (hero NEXT UP,
                this card, a Pear todo, a milestone row). When the
                golden thread already names the nudge, the momentum
                card stands down. */}
            {rsvpMomentum && nextStep?.id !== 'nudge' && <RsvpMomentumCard momentum={rsvpMomentum} />}
            <GuestPulse counts={guestCounts} domain={site?.domain ?? null} loading={guests === null} />
            <Milestones milestones={milestones} dateShort={eventDateShort} />
            <SiblingEventsCard occasion={occasion} sites={sites ?? []} origin={site ?? null} />
          </div>
        </div>
      </div>

    </DashLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// HeroBand — 3-column hero card. Names · Next milestone · Progress
// ─────────────────────────────────────────────────────────────
function HeroBand({
  firstName,
  namesArr,
  eventDateLabel,
  venue,
  daysUntil,
  stage,
  nextMilestone,
  nextStep,
  nextStepHref,
  hasManifest,
  progressDone,
  progressTotal,
  newSinceVisit,
  liveDisplay,
}: {
  firstName: string;
  namesArr: string[];
  eventDateLabel: string | null;
  venue: string | null;
  daysUntil: number | null;
  stage: Stage;
  nextMilestone: Milestone | null;
  nextStep: NextStep | null;
  nextStepHref: string | null;
  hasManifest: boolean;
  progressDone: number;
  progressTotal: number;
  newSinceVisit: number;
  liveDisplay: string;
}) {
  const pct = progressTotal === 0 ? 0 : Math.round((progressDone / progressTotal) * 100);
  const stagePill = STAGE_PILL[stage];
  const urgencyTone = nextMilestone?.urgency === 'urgent' ? 'peach'
    : nextMilestone?.urgency === 'soon' ? 'lavender' : 'sage';
  const urgencyColor =
    urgencyTone === 'peach' ? 'var(--peach-ink)' :
    urgencyTone === 'lavender' ? 'var(--lavender-ink)' : 'var(--sage-deep)';
  const urgencyBg =
    urgencyTone === 'peach' ? 'var(--peach-bg)' :
    urgencyTone === 'lavender' ? 'var(--lavender-bg)' : 'var(--sage-tint)';
  // Golden-thread tone — the nudge step is time-boxed (reply-by
  // inside 7 days), so it gets the urgent peach; publish gets
  // lavender; everything else stays calm sage.
  const stepTone = nextStep?.id === 'nudge' ? 'peach'
    : nextStep?.id === 'publish' ? 'lavender' : 'sage';
  const stepColor =
    stepTone === 'peach' ? 'var(--peach-ink)' :
    stepTone === 'lavender' ? 'var(--lavender-ink)' : 'var(--sage-deep)';
  const stepBg =
    stepTone === 'peach' ? 'var(--peach-bg)' :
    stepTone === 'lavender' ? 'var(--lavender-bg)' : 'var(--sage-tint)';
  void firstName; void liveDisplay;

  // Phones: the 3-column band crushes every zone (clipped names,
  // vertical-word milestone, overlapping PLANNING header). Stack
  // the three zones as full-width rows instead. The inline style
  // is the one that wins, so it has to be responsive itself — the
  // styled-jsx 920px rule below stays as a backstop.
  const isNarrow = useIsMobile(920);

  return (
    <div
      className="hero-band"
      style={{
        background: 'linear-gradient(180deg, var(--card, #FBF7EE) 0%, var(--cream-2, #FBF6E8) 100%)',
        border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
        borderRadius: 16,
        padding: 'clamp(20px, 3vw, 28px)',
        display: 'grid',
        gridTemplateColumns: isNarrow ? '1fr' : '1.4fr 1fr 1fr',
        gap: isNarrow ? 18 : 28,
        alignItems: isNarrow ? 'stretch' : 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* LEFT — names + meta */}
      <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
        {/* Atmosphere glyph — gold thread squiggle, decorative only.
            Anchored INSIDE the left column so it can never drift
            onto the middle column (the old right:220 magic number
            collided with it around 960-1100px). */}
        <svg
          width="120"
          height="30"
          viewBox="0 0 160 40"
          aria-hidden
          style={{
            display: isNarrow ? 'none' : undefined,
            position: 'absolute',
            top: -4,
            right: 8,
            opacity: 0.4,
            transform: 'rotate(-10deg)',
            pointerEvents: 'none',
            color: 'var(--gold-line, #D4A95D)',
          }}
        >
          <path d="M2 20 Q 20 4 38 20 T 74 20 T 110 20 T 146 20" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        </svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <span className="eyebrow" style={{ color: 'var(--peach-ink)' }}>
            {daysUntil == null ? 'Your celebration' : daysUntil === 0 ? 'Today' : `${daysUntil} days until`}
          </span>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '4px 10px', borderRadius: 999,
              fontSize: 11.5, fontWeight: 600,
              background: stagePill.bg, color: stagePill.fg,
            }}
          >
            {stagePill.label}
          </span>
        </div>
        <h2
          className="display pl-letterpress"
          style={{
            fontSize: 'clamp(32px, 4vw, 48px)',
            margin: 0,
            lineHeight: 0.98,
            fontWeight: 500,
            letterSpacing: '-0.02em',
          }}
        >
          {namesArr.length >= 2 ? (
            <>
              {namesArr[0]}{' '}
              <span className="display-italic" style={{ color: 'var(--ink)' }}>&amp;</span>
              {' '}{namesArr[1]}
            </>
          ) : namesArr[0] ?? 'Your celebration'}
        </h2>
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            color: 'var(--ink-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {eventDateLabel ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="calendar" size={13} /> {eventDateLabel}
            </span>
          ) : (
            <span style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>Set a date in the editor.</span>
          )}
          {venue && (
            <>
              <span style={{ width: 3, height: 3, background: 'var(--ink-muted)', borderRadius: '50%' }}/>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="pin" size={13} /> {venue}
              </span>
            </>
          )}
        </div>
      </div>

      {/* MIDDLE — 'Next up' callout. Wired to the golden thread
          (nextStepFor over the live manifest + guest counts) so
          the dashboard names the same step as the editor's topbar
          chip. Falls back to the milestone roadmap only when the
          manifest hasn't loaded yet. */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {nextStep && nextStepHref ? (
          <Link
            href={nextStepHref}
            style={{
              display: 'block',
              padding: '14px 16px',
              borderRadius: 10,
              background: stepBg,
              border: `1px solid ${stepTone === 'peach' ? 'color-mix(in oklab, var(--peach-ink, #C6703D) 18%, transparent)' : 'transparent'}`,
              textDecoration: 'none',
            }}
          >
            <div className="eyebrow" style={{ color: stepColor, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold, #C19A4B)' }} />
              NEXT UP
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 600,
                color: stepColor,
                lineHeight: 1.1,
              }}
            >
              {nextStep.label}
            </div>
            <div style={{ fontSize: 13, color: stepColor, opacity: 0.85, marginTop: 4 }}>
              {nextStep.hint}
            </div>
          </Link>
        ) : hasManifest ? (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'var(--cream-2)',
              fontSize: 13,
              color: 'var(--ink-muted)',
              fontStyle: 'italic',
            }}
          >
            All threaded. Pear&apos;s keeping watch.
          </div>
        ) : nextMilestone ? (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: urgencyBg,
              border: `1px solid ${urgencyTone === 'peach' ? 'color-mix(in oklab, var(--peach-ink, #C6703D) 18%, transparent)' : 'transparent'}`,
            }}
          >
            <div className="eyebrow" style={{ color: urgencyColor, marginBottom: 4 }}>NEXT UP</div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 600,
                color: urgencyColor,
                lineHeight: 1.1,
              }}
            >
              {nextMilestone.label}
            </div>
            <div style={{ fontSize: 13, color: urgencyColor, opacity: 0.85, marginTop: 4 }}>
              {nextMilestone.sub}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'var(--cream-2)',
              fontSize: 13,
              color: 'var(--ink-muted)',
              fontStyle: 'italic',
            }}
          >
            All quiet. Pear&apos;s keeping watch.
          </div>
        )}
      </div>

      {/* RIGHT — progress + activity */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          {/* gap + nowrap so the label and the counter can never
              overlap, no matter how narrow the column gets. */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 12, flexWrap: 'nowrap' }}>
            <span className="eyebrow" style={{ whiteSpace: 'nowrap' }}>PLANNING</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <strong style={{ fontWeight: 700, color: 'var(--ink)' }}>{progressDone}</strong> of {progressTotal}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--cream-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--sage), var(--sage-deep))',
                borderRadius: 999,
                transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        </div>

        {newSinceVisit > 0 ? (
          <a
            href="#feed"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--ink)',
              fontWeight: 500,
              padding: '8px 12px',
              borderRadius: 10,
              background: 'var(--cream-2)',
              textDecoration: 'none',
            }}
          >
            <span
              style={{ width: 7, height: 7, background: 'var(--peach-ink)', borderRadius: '50%' }}
              className="pulse-dot"
            />
            <strong style={{ fontWeight: 700 }}>{newSinceVisit}</strong> recent {newSinceVisit === 1 ? 'reply' : 'replies'}
            <Icon name="arrow-right" size={13} style={{ marginLeft: 'auto' }} />
          </a>
        ) : (
          <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', padding: '8px 12px' }}>
            All quiet. Pear&apos;s keeping watch.
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 920px) {
          .hero-band {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/** Route the golden-thread step to the right dashboard surface.
 *  Editor rungs (cover/date/gallery/story) deep-link into the
 *  editor's matching property-rail panel via `?jump=` so "Add
 *  your cover photo" actually opens the Hero panel (and the
 *  props sheet on phones). Publish opens the editor plain — the
 *  topbar Publish button is the flow's entry point. Guest rungs
 *  land on /dashboard/rsvp (DashGuests): the roster with add /
 *  CSV import, and the NudgeStrip's composer for pending
 *  replies. (NOT /dashboard/invite — that's the stationery
 *  Studio, which confused guest-list clicks for months.) */
function hrefForNextStep(step: NextStep, editorHref: string): string {
  if (step.target === 'guests') return '/dashboard/rsvp';
  if (step.target === 'publish') return editorHref;
  return `${editorHref}?jump=${step.target}`;
}

// ─────────────────────────────────────────────────────────────
// RsvpMomentumCard — pending replies + reply-by inside 7 days.
// The CTA deep-links to /dashboard/rsvp, where the existing
// NudgeStrip opens the Pear-drafted NudgeComposer — we never
// rebuild the composer here.
// ─────────────────────────────────────────────────────────────
function RsvpMomentumCard({ momentum }: { momentum: RsvpMomentum }) {
  const dateLabel = momentum.replyBy.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const windowLine = momentum.daysLeft === 0 ? 'Reply-by is today.'
    : momentum.daysLeft === 1 ? 'Reply-by lands tomorrow.'
    : `Reply-by lands in ${momentum.daysLeft} days.`;
  return (
    <div
      className="card"
      style={{
        padding: 20,
        borderRadius: 16,
        background: 'var(--peach-bg)',
        border: '1px solid color-mix(in oklab, var(--peach-ink, #C6703D) 28%, transparent)',
      }}
    >
      <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--peach-ink)' }} className="pulse-dot" />
        RSVP MOMENTUM
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--peach-ink)',
          lineHeight: 1.15,
        }}
      >
        {momentum.pending} still pending — reply-by {dateLabel}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--peach-ink)', opacity: 0.85, marginTop: 4 }}>
        {windowLine} Pear has a gentle reminder drafted.
      </div>
      <Link
        href="/dashboard/rsvp"
        className="btn btn-primary btn-sm"
        style={{ textDecoration: 'none', marginTop: 12, display: 'inline-flex' }}
      >
        Nudge them with Pear <Icon name="sparkles" size={11} color="var(--cream)" />
      </Link>
    </div>
  );
}

const STAGE_PILL: Record<Stage, { label: string; bg: string; fg: string }> = {
  early: { label: 'Just getting started', bg: 'var(--lavender-bg)', fg: 'var(--lavender-ink)' },
  mid:   { label: 'Mid-planning',         bg: 'var(--sage-tint)',   fg: 'var(--sage-deep)' },
  late:  { label: 'Final stretch',        bg: 'var(--peach-bg)',    fg: 'var(--peach-ink)' },
};

// ─────────────────────────────────────────────────────────────
// QuickJumps — 4 stage-aware tiles
// ─────────────────────────────────────────────────────────────
interface JumpTile {
  label: string;
  sub: string;
  icon: string;
  href: string;
  glow?: boolean;
  dim?: boolean;
}

function QuickJumps({
  stage, editorHref, liveHref, liveDisplay, domain,
}: {
  stage: Stage;
  editorHref: string;
  liveHref: string;
  liveDisplay: string;
  domain: string | null;
}) {
  const tiles: JumpTile[] = (() => {
    if (stage === 'early') {
      return [
        { label: 'Open the editor',  sub: 'Edit your wedding site',                      icon: 'brush',   href: editorHref },
        { label: 'Build guest list', sub: 'Import or draft with Pear',                   icon: 'users',   href: '/dashboard/rsvp' },
        { label: 'Studio',           sub: 'Save-the-dates & invites',                    icon: 'palette', href: '/dashboard/invite' },
        { label: 'Day-of room',      sub: 'Locked until 30 days out',                    icon: 'lock',    href: '/dashboard/day-of', dim: true },
      ];
    }
    if (stage === 'late') {
      return [
        { label: 'Day-of room',      sub: 'Open now — timeline & vendors',                icon: 'calendar', href: '/dashboard/day-of', glow: true },
        { label: 'Seating chart',    sub: 'Place guests at tables',                       icon: 'grid',     href: '/dashboard/seating' },
        { label: 'Open the editor',  sub: 'Final tweaks to the site',                     icon: 'brush',    href: editorHref },
        { label: 'Print orders',     sub: 'Programs ready to send',                       icon: 'send',     href: '/dashboard/print' },
      ];
    }
    return [
      { label: 'Open the editor',  sub: 'Edit your wedding site',                          icon: 'brush', href: editorHref },
      { label: 'Send invitations', sub: 'Pear has cadences ready',                         icon: 'send',  href: '/dashboard/cadence' },
      { label: 'Studio',           sub: 'Save-the-dates & invites',                        icon: 'palette', href: '/dashboard/invite' },
      { label: 'View live site',   sub: domain ? liveDisplay : 'Publish to share',         icon: 'eye',   href: liveHref },
    ];
  })();

  /* Inline grid for the same styled-jsx race reason as the work
     zone above — 4-up desktop, 2-up under 760px. */
  const twoCol = useIsMobile(760);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: twoCol ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
      {tiles.map((j) => (
        <Link
          key={j.label}
          href={j.href}
          className="lift"
          style={{
            padding: '14px 16px',
            borderRadius: 16,
            background: j.glow ? 'var(--ink)' : 'var(--card, #FBF7EE)',
            color: j.glow ? 'var(--cream)' : 'var(--ink)',
            border: j.glow ? 'none' : '1px solid var(--card-ring, rgba(14,13,11,0.08))',
            opacity: j.dim ? 0.55 : 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            minHeight: 78,
            position: 'relative',
            textDecoration: 'none',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Icon name={j.icon} size={18} color={j.glow ? 'var(--cream)' : 'var(--gold)'} />
            {j.glow && (
              <span
                style={{ width: 6, height: 6, background: 'var(--peach)', borderRadius: '50%' }}
                className="pulse-dot"
              />
            )}
          </div>
          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{j.label}</div>
            <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>{j.sub}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PearRecommendations — Pear's 3 "worth your minute" todos
// ─────────────────────────────────────────────────────────────
interface PearTodo {
  title: string;
  sub: string;
  cta: string;
  href: string;
  urgency: 'now' | 'soon' | 'later';
}

function usePearTodos({
  stage, insights, guestCounts, daysUntil, suppressNudge = false,
}: {
  stage: Stage;
  insights: GuestInsight[] | null;
  guestCounts: { invited: number; yes: number; no: number; maybe: number; pending: number } | null;
  daysUntil: number | null;
  /** The hero's golden-thread card already names the pending-RSVP
   *  nudge — skip the todo that would repeat it. */
  suppressNudge?: boolean;
}): PearTodo[] {
  return useMemo(() => {
    const out: PearTodo[] = [];

    // 1) Insight-driven todos take precedence — Pear flagged these.
    const ordered = insights ? [...insights].sort((a, b) => severityRank(a.severity) - severityRank(b.severity)) : [];
    for (const ins of ordered.slice(0, 2)) {
      out.push({
        title: ins.title,
        sub: ins.detail,
        cta: ins.action?.label ?? 'Review',
        href: '/dashboard/guest-review',
        urgency: ins.severity === 'urgent' ? 'now' : ins.severity === 'attention' ? 'soon' : 'later',
      });
    }

    // 2) Stage-specific suggestions to fill the rest.
    if (stage === 'early') {
      if (out.length < 3) out.push({
        title: 'Build your guest list',
        sub: 'Pear can suggest one from your story, or import contacts.',
        cta: 'Start with Pear',
        href: '/dashboard/rsvp',
        urgency: 'now',
      });
      if (out.length < 3) out.push({
        title: 'Pick a save-the-date',
        sub: 'Three styles ready to try in the studio.',
        cta: 'Preview',
        href: '/dashboard/invite',
        urgency: 'soon',
      });
    } else if (stage === 'late') {
      if (out.length < 3 && !suppressNudge && guestCounts && guestCounts.pending > 0) out.push({
        title: `Chase ${guestCounts.pending} pending RSVP${guestCounts.pending === 1 ? '' : 's'}`,
        sub: daysUntil != null
          ? `${daysUntil} days until the date. Pear has a final-reminder draft.`
          : 'Pear has a final-reminder draft ready.',
        cta: 'Send for me',
        href: '/dashboard/cadence',
        urgency: 'now',
      });
      if (out.length < 3) out.push({
        title: 'Day-of timeline',
        sub: 'Vendors, run-of-show, and a single source of truth.',
        cta: 'Open Day-of',
        href: '/dashboard/day-of',
        urgency: 'soon',
      });
    } else {
      if (out.length < 3 && !suppressNudge && guestCounts && guestCounts.pending > 0) out.push({
        title: `Send a reminder cadence`,
        sub: `${guestCounts.pending} guest${guestCounts.pending === 1 ? '' : 's'} haven't replied yet.`,
        cta: 'Review draft',
        href: '/dashboard/cadence',
        urgency: 'soon',
      });
      if (out.length < 3) out.push({
        title: 'Confirm the schedule',
        sub: 'Welcome dinner, ceremony, reception — all on one page.',
        cta: 'Open Schedule',
        href: '/editor',
        urgency: 'soon',
      });
    }
    return out.slice(0, 3);
  }, [stage, insights, guestCounts, daysUntil, suppressNudge]);
}

function severityRank(s: GuestInsight['severity']): number {
  return s === 'urgent' ? 0 : s === 'attention' ? 1 : 2;
}

function PearRecommendations({ todos, domain }: { todos: PearTodo[]; domain: string | null }) {
  void domain;
  // On phones the trailing CTA squeezes the copy — drop the button
  // to its own row under the text instead.
  const isNarrow = useIsMobile(720);
  if (todos.length === 0) {
    return null;
  }
  return (
    <div
      className="card"
      style={{
        padding: 20,
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
        borderRadius: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pear size={28} tone="sage" sparkle shadow={false} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, lineHeight: 1 }}>
              From Pear
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>
              {todos.length} {todos.length === 1 ? 'thing' : 'things'} worth your minute
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {todos.map((it, i) => {
          const urgent = it.urgency === 'now';
          const stripeColor =
            it.urgency === 'now' ? 'var(--peach-ink)' :
            it.urgency === 'soon' ? 'var(--lavender-2)' : 'var(--sage)';
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: isNarrow ? '6px 1fr' : '6px 1fr auto',
                gap: isNarrow ? 12 : 14,
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 10,
                background: 'var(--card)',
                border: '1px solid var(--line-soft)',
              }}
            >
              <span style={{ width: 6, height: 36, borderRadius: 999, background: stripeColor }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{it.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{it.sub}</div>
              </div>
              <Link
                href={it.href}
                className={`btn ${urgent ? 'btn-primary' : 'btn-outline'} btn-sm`}
                style={{
                  textDecoration: 'none',
                  // Narrow: button drops to its own row, aligned
                  // under the copy (past the stripe column).
                  ...(isNarrow ? { gridColumn: '2', justifySelf: 'start' } : null),
                }}
              >
                {it.cta}
                {urgent && <Icon name="arrow-right" size={12} color="var(--cream)" />}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ActivityFeed — recent RSVPs as a vertical timeline
// ─────────────────────────────────────────────────────────────
function ActivityFeed({ activity, stage }: { activity: Guest[]; stage: Stage }) {
  void stage;
  return (
    <div className="card" id="feed" style={{ padding: 20, borderRadius: 20 }}>
      <SectionHeader icon="bell">Activity</SectionHeader>
      {activity.length === 0 ? (
        <div style={{ padding: '24px 8px', fontSize: 13, color: 'var(--ink-muted)', textAlign: 'center', fontStyle: 'italic' }}>
          Nothing yet. As guests RSVP or leave notes, it&apos;ll show up here.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* The thread — the brand's visual atom (BRAND.md §3):
              two strands, olive and gold, instead of a gray rule. */}
          <div aria-hidden style={{ position: 'absolute', left: 16, top: 8, bottom: 8, width: 1, background: 'var(--sage, #7A8A4F)', opacity: 0.55 }} />
          <div aria-hidden style={{ position: 'absolute', left: 18.5, top: 8, bottom: 8, width: 1, background: 'var(--gold, #C19A4B)', opacity: 0.5 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activity.map((g) => {
              const tone = g.status === 'no' || g.status === 'declined'
                ? { bg: 'var(--cream-2)', fg: 'var(--ink-soft)' }
                : { bg: 'var(--sage-tint)', fg: 'var(--sage-deep)' };
              const verb = (g.status === 'yes' || g.status === 'attending')
                ? 'said yes'
                : (g.status === 'no' || g.status === 'declined') ? 'declined'
                : 'said maybe';
              return (
                <div
                  key={g.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr auto',
                    gap: 12,
                    alignItems: 'flex-start',
                    padding: '10px 0',
                  }}
                >
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: tone.bg, color: tone.fg,
                      display: 'grid', placeItems: 'center',
                      position: 'relative', zIndex: 1,
                      border: '2px solid var(--card)',
                    }}
                  >
                    <Icon name="check" size={15} color={tone.fg} />
                  </div>
                  <div style={{ minWidth: 0, paddingTop: 6 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.4 }}>
                      <strong style={{ fontWeight: 600 }}>{g.name}</strong>{' '}
                      {verb}
                      {g.plusOneName ? <> — bringing +1 (<em style={{ fontStyle: 'normal' }}>{g.plusOneName}</em>)</> : null}
                    </div>
                    {g.message && (
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2, fontStyle: 'italic' }}>
                        &ldquo;{g.message}&rdquo;
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', paddingTop: 8, whiteSpace: 'nowrap' }}>
                    {relativeTime(g.respondedAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GuestPulse — % responded + stacked yes/no/maybe/pending bar
// ─────────────────────────────────────────────────────────────
function GuestPulse({
  counts, domain, loading,
}: {
  counts: { invited: number; yes: number; no: number; maybe: number; pending: number } | null;
  domain: string | null;
  loading: boolean;
}) {
  void domain;
  // Narrow: the 4-up legend squeezes "PENDING" past its column —
  // fall back to a 2×2 grid.
  const isNarrow = useIsMobile(720);
  if (loading) {
    return (
      <div className="card" style={{ padding: 20, borderRadius: 20 }}>
        <SectionHeader icon="users">Guests</SectionHeader>
        <div style={{ padding: '14px 4px 4px', fontSize: 13, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
          Threading…
        </div>
      </div>
    );
  }
  if (!counts || counts.invited === 0) {
    return (
      <div className="card" style={{ padding: 20, borderRadius: 20 }}>
        <SectionHeader icon="users">Guests</SectionHeader>
        <div
          style={{
            padding: '20px 8px',
            background: 'var(--cream-2)',
            borderRadius: 10,
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 6 }}>Nothing yet. Begin a thread.</div>
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--ink-soft)',
              marginBottom: 14,
              maxWidth: 240,
              marginInline: 'auto',
            }}
          >
            Pear can draft a list from your story, or import from your contacts.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/rsvp" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              Start with Pear <Icon name="sparkles" size={11} color="var(--cream)" />
            </Link>
            <Link href="/dashboard/rsvp" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
              Import contacts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { invited, yes, no, maybe, pending } = counts;
  const respondedPct = invited === 0 ? 0 : Math.round(((yes + no + maybe) / invited) * 100);
  const segs: { val: number; color: string; label: string }[] = [
    { val: yes,     color: 'var(--sage)',       label: 'Yes' },
    { val: no,      color: 'var(--ink-muted)',  label: 'No' },
    { val: maybe,   color: 'var(--lavender-2)', label: 'Maybe' },
    { val: pending, color: 'var(--cream-3)',    label: 'Pending' },
  ];

  return (
    <div className="card" style={{ padding: 20, borderRadius: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="users" size={15} color="var(--gold)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>Guests</span>
        </div>
        <Link
          href="/dashboard/rsvp"
          style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none' }}
        >
          Open Guests
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, lineHeight: 1 }}>
          {respondedPct}<span style={{ fontSize: 18, color: 'var(--ink-muted)' }}>%</span>
        </span>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          responded · {yes + no + maybe} of {invited}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          height: 10,
          borderRadius: 999,
          overflow: 'hidden',
          marginTop: 12,
          marginBottom: 12,
          background: 'var(--cream-2)',
        }}
      >
        {segs.map((s) => s.val > 0 && (
          <div
            key={s.label}
            style={{ flex: s.val, background: s.color, transition: 'flex var(--pl-dur-base) var(--pl-ease-out)' }}
            title={`${s.label}: ${s.val}`}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 6 }}>
        {segs.map((s) => (
          <div key={s.label} style={{ padding: '8px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
              <span
                style={{
                  fontSize: 10.5, color: 'var(--ink-muted)',
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}
              >
                {s.label}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Milestones — vertical roadmap
// ─────────────────────────────────────────────────────────────
type MilestoneStatus = 'done' | 'urgent' | 'next' | 'upcoming' | 'distant';
interface Milestone {
  date: string;
  label: string;
  sub: string;
  status: MilestoneStatus;
  urgency: 'urgent' | 'soon' | 'on-track';
}

function buildMilestones({
  stage, eventDate, eventDateShort, daysUntil, guestCounts, cadence,
}: {
  stage: Stage;
  eventDate: Date | null;
  eventDateShort: string | null;
  daysUntil: number | null;
  guestCounts: { invited: number; yes: number; no: number; maybe: number; pending: number } | null;
  cadence?: CadencePhaseLite[] | null;
}): Milestone[] {
  const out: Milestone[] = [];
  out.push({ date: 'Done', label: 'Site claimed', sub: '', status: 'done', urgency: 'on-track' });
  if (eventDate) {
    out.push({ date: 'Done', label: 'Date locked', sub: eventDateShort ?? '', status: 'done', urgency: 'on-track' });
  } else {
    out.push({ date: 'Now', label: 'Lock the date', sub: 'Anchors every milestone', status: 'next', urgency: 'soon' });
  }

  // ── Real roadmap — the host's Smart Send Cadence. Sent phases are
  //    genuinely done; scheduled phases carry real dates; presets are
  //    Pear's date-derived suggestions. This replaces the previous
  //    stage-hardcoded ladder ("Book vendors · ~4 mo") whose progress
  //    bar measured fiction. The synthetic ladder below survives only
  //    as the fallback when there's no event date / cadence data. */
  const phases = (cadence ?? [])
    .filter((ph) => ph.status !== 'cancelled' && ph.status !== 'failed' && ph.scheduledAt)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  if (eventDate && phases.length > 0) {
    let nextAssigned = false;
    for (const ph of phases.slice(0, 5)) {
      const due = new Date(ph.scheduledAt);
      const dateLabel = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (ph.status === 'sent') {
        out.push({ date: 'Done', label: ph.label, sub: ph.sentCount ? `${ph.sentCount} sent` : 'sent', status: 'done', urgency: 'on-track' });
        continue;
      }
      const daysToDue = Math.round((due.getTime() - Date.now()) / 86_400_000);
      const isFirstOpen = !nextAssigned;
      nextAssigned = true;
      const urgent = ph.status === 'scheduled' && daysToDue <= 7;
      out.push({
        date: daysToDue <= 0 ? 'Now' : dateLabel,
        label: ph.label,
        sub: ph.status === 'scheduled'
          ? (daysToDue <= 0 ? 'sending today' : `sends in ${daysToDue} day${daysToDue === 1 ? '' : 's'}`)
          : ph.status === 'draft' ? 'drafted — approve to schedule' : 'suggested by Pear',
        status: urgent ? 'urgent' : isFirstOpen ? 'next' : 'upcoming',
        urgency: urgent ? 'urgent' : isFirstOpen ? 'soon' : 'on-track',
      });
    }
    if (eventDateShort) {
      out.push({
        date: eventDateShort,
        label: 'The big day',
        sub: daysUntil != null ? `${daysUntil} days out` : '',
        status: 'distant',
        urgency: 'on-track',
      });
    }
    return out;
  }

  if (stage === 'early') {
    out.push({ date: 'This week', label: 'Send save-the-dates', sub: 'recommended now', status: 'next', urgency: 'soon' });
    out.push({ date: '~4 mo',     label: 'Book vendors',         sub: 'in roughly four months', status: 'upcoming', urgency: 'on-track' });
    out.push({ date: '~10 mo',    label: 'Send invitations',     sub: 'with the guest list', status: 'upcoming', urgency: 'on-track' });
  } else if (stage === 'mid') {
    if (guestCounts && guestCounts.invited > 0) {
      out.push({ date: 'Done', label: 'Save-the-dates sent', sub: `${guestCounts.invited} invited`, status: 'done', urgency: 'on-track' });
    }
    out.push({ date: 'Soon',  label: 'RSVP cutoff',        sub: daysUntil ? `~${Math.max(30, Math.round(daysUntil / 4))} days out` : '~30 days', status: 'next', urgency: 'soon' });
    out.push({ date: 'Later', label: 'Final menu count',   sub: 'caterer needs the headcount', status: 'upcoming', urgency: 'on-track' });
    out.push({ date: 'Later', label: 'Seating chart',      sub: 'after RSVPs close', status: 'upcoming', urgency: 'on-track' });
  } else if (stage === 'late') {
    if (guestCounts && guestCounts.invited > 0) {
      out.push({ date: 'Done', label: 'Invitations sent',  sub: `${guestCounts.invited} invited`, status: 'done', urgency: 'on-track' });
    }
    if (guestCounts && guestCounts.pending > 0) {
      out.push({
        date: 'Now',
        label: 'RSVP cutoff',
        sub: `${guestCounts.pending} pending · ${daysUntil ?? 0} days out`,
        status: 'urgent',
        urgency: 'urgent',
      });
    } else {
      out.push({ date: 'Done', label: 'RSVP cutoff', sub: 'all replies in', status: 'done', urgency: 'on-track' });
    }
    out.push({ date: 'Soon', label: 'Final count to caterer', sub: 'lock the headcount', status: 'next', urgency: 'soon' });
    out.push({ date: 'Soon', label: 'Seating finalized',     sub: 'place every name',    status: 'upcoming', urgency: 'on-track' });
  }

  if (eventDateShort) {
    out.push({
      date: eventDateShort,
      label: 'The big day',
      sub: daysUntil != null ? `${daysUntil} days out` : '',
      status: 'distant',
      urgency: 'on-track',
    });
  }
  return out;
}

function Milestones({ milestones, dateShort }: { milestones: Milestone[]; dateShort: string | null }) {
  // Narrow: the date/dot/title/annotation 4-column row wraps
  // awkwardly — drop the annotation onto its own muted line under
  // the title and tighten the date gutter.
  const isNarrow = useIsMobile(720);
  return (
    <div className="card" style={{ padding: 20, borderRadius: 20 }}>
      <SectionHeader icon="calendar">
        {dateShort ? <>The road to {dateShort}</> : 'Your timeline'}
      </SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {milestones.map((m, i) => {
          const isLast = i === milestones.length - 1;
          const dot = milestoneDotStyle(m.status);
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: isNarrow ? '64px 22px 1fr' : '76px 22px 1fr auto',
                gap: isNarrow ? 10 : 12,
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: !isLast ? '1px solid var(--line-soft)' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color:
                    m.status === 'urgent' ? 'var(--peach-ink)' :
                    m.status === 'done' ? 'var(--sage-deep)' : 'var(--ink-muted)',
                  textTransform: m.status === 'done' || m.status === 'urgent' ? 'uppercase' : 'none',
                  letterSpacing: m.status === 'done' || m.status === 'urgent' ? '0.05em' : 0,
                }}
              >
                {m.date}
              </div>
              <div style={{ position: 'relative', display: 'grid', placeItems: 'center', height: 22 }}>
                <span
                  style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: dot.bg, border: `2px solid ${dot.border}`,
                    display: 'grid', placeItems: 'center',
                  }}
                  className={dot.pulse ? 'pulse-dot' : ''}
                >
                  {dot.check && <Icon name="check" size={8} color="var(--card, #FBF7EE)" strokeWidth={3} />}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--ink)',
                    fontWeight: m.status === 'urgent' || m.status === 'next' ? 600 : 500,
                    textDecoration: m.status === 'done' ? 'line-through' : 'none',
                    opacity: m.status === 'done' ? 0.7 : 1,
                  }}
                >
                  {m.label}
                </div>
                {isNarrow && m.sub && (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{m.sub}</div>
                )}
              </div>
              {!isNarrow && (
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{m.sub}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function milestoneDotStyle(status: MilestoneStatus): { bg: string; border: string; check: boolean; pulse: boolean } {
  if (status === 'done')    return { bg: 'var(--sage)',       border: 'var(--sage)',       check: true,  pulse: false };
  if (status === 'urgent')  return { bg: 'var(--peach-ink)',  border: 'var(--peach-ink)',  check: false, pulse: true  };
  if (status === 'next')    return { bg: 'var(--card)',       border: 'var(--ink)',        check: false, pulse: false };
  if (status === 'distant') return { bg: 'var(--ink)',        border: 'var(--ink)',        check: false, pulse: false };
  return                          { bg: 'var(--card)',       border: 'var(--ink-muted)',  check: false, pulse: false };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ResumeDraftCard — the way back into a half-finished wizard run.
//
// The wizard auto-persists its state to localStorage on every
// change ('Save draft' was already honest), but nothing on the
// dashboard ever said so — a host who stepped away had to KNOW
// /wizard/new resumes. This card reads the draft client-side and
// names what's in it. Renders nothing without a meaningful draft.
// ─────────────────────────────────────────────────────────────
function ResumeDraftCard() {
  /* Read after mount via a 0ms timer — SSR + first client paint
     agree (no card), then the draft pops in. The timer keeps the
     compiler's setState-in-effect rule happy and avoids the
     hydration mismatch a lazy localStorage initializer causes. */
  const [draft, setDraft] = useState<{ occasion?: string; names?: [string, string] } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem('pl-wizard-state-v1');
        if (!raw) return;
        const parsed = JSON.parse(raw) as { occasion?: string; names?: [string, string] };
        if (parsed && (parsed.occasion || parsed.names?.[0])) setDraft(parsed);
      } catch { /* no draft is fine */ }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  if (!draft) return null;
  const who = (draft.names ?? []).filter(Boolean).join(' & ');
  const what = draft.occasion ? draft.occasion.replace(/-/g, ' ') : 'celebration';
  return (
    <section
      style={{
        background: 'var(--card)',
        border: '1px dashed var(--pl-olive, #5C6B3F)',
        borderRadius: 'var(--r-md, 20px)',
        padding: '16px 18px',
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pl-olive, #5C6B3F)', marginBottom: 6 }}>
        A thread in progress
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 10 }}>
        Your {what}{who ? ` for ${who}` : ''} is saved right where you left it.
      </div>
      <Link
        href="/wizard/new"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 999, textDecoration: 'none',
          background: 'var(--pl-olive, #5C6B3F)', color: 'var(--cream, #F5EFE2)',
          fontSize: 12.5, fontWeight: 700,
        }}
      >
        Pick the thread back up →
      </Link>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// RememberingCard — the third act, surfaced.
//
// The Remember loop already runs server-side (day-after recap
// email, anniversary rebroadcast cron, /sites/{slug}/recap built
// from guest photos + guestbook + RSVP notes) — but the dashboard
// never told the host any of it existed. Once the date passes,
// this card leads the right column. Every link is a real surface.
// ─────────────────────────────────────────────────────────────
function RememberingCard({ domain, occasion, daysSince }: { domain: string; occasion: string; daysSince: number }) {
  const solemn = occasion === 'memorial' || occasion === 'funeral';
  const recapHref = `/sites/${domain}/recap`;
  return (
    <section
      style={{
        background: 'var(--card)',
        border: '1px solid var(--gold-line, #D0B070)',
        borderRadius: 'var(--r-md, 20px)',
        padding: '18px 18px 14px',
      }}
    >
      <SectionHeader icon="bookmark">{solemn ? 'The remembering' : 'The remembering begins'}</SectionHeader>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '-6px 0 12px' }}>
        {daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`} — and the memory book is already weaving
        itself from your guests&rsquo; photos, signatures, and notes. It grows as more arrives.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link
          href={recapHref}
          style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            padding: '9px 12px', borderRadius: 12,
            border: '1px solid var(--gold-line, #D0B070)', textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Open the memory book</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>share it with everyone who was there</span>
          <span aria-hidden style={{ marginLeft: 'auto', color: 'var(--gold, #C19A4B)', fontSize: 13 }}>→</span>
        </Link>
        <Link
          href="/dashboard/memory-book"
          style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            padding: '9px 12px', borderRadius: 12,
            border: '1px dashed var(--line)', textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Print the keepsake</span>
          <span aria-hidden style={{ marginLeft: 'auto', color: 'var(--pl-olive, #5C6B3F)', fontSize: 13 }}>→</span>
        </Link>
        {!solemn && (
          <Link
            href="/dashboard/rsvp"
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              padding: '9px 12px', borderRadius: 12,
              border: '1px dashed var(--line)', textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Send the thank-yous</span>
            <span aria-hidden style={{ marginLeft: 'auto', color: 'var(--pl-olive, #5C6B3F)', fontSize: 13 }}>→</span>
          </Link>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// AnniversaryCard — one year, woven.
//
// The anniversary occasion + the rebroadcast existed, but nothing
// ever NUDGED a host toward them — a feature with no entry point.
// Around the first anniversary this card offers to begin the
// anniversary edition as a sibling site (same celebration id via
// the wizard's ?from= linkage), so both sites cross-reference.
// ─────────────────────────────────────────────────────────────
function AnniversaryCard({
  daysSince,
  origin,
}: {
  daysSince: number;
  origin: { domain?: string; names?: [string, string] | null; manifest?: unknown };
}) {
  const daysToAnniversary = 365 - daysSince;
  const when =
    daysToAnniversary > 1 ? `${daysToAnniversary} days from now`
    : daysToAnniversary === 1 ? 'tomorrow'
    : daysToAnniversary === 0 ? 'today'
    : `${-daysToAnniversary} days ago`;
  const originCeleb = (origin.manifest as { celebration?: { id?: string; name?: string } } | undefined)?.celebration;
  const celebName = originCeleb?.name
    ?? (origin.names ?? []).filter(Boolean).join(' & ')
    ?? '';
  const linkParams = origin.domain
    ? `&from=${encodeURIComponent(origin.domain)}`
      + (originCeleb?.id ? `&cid=${encodeURIComponent(originCeleb.id)}` : '')
      + (celebName ? `&cname=${encodeURIComponent(celebName)}` : '')
    : '';
  return (
    <section
      style={{
        background: 'var(--card)',
        border: '1px solid var(--gold-line, #D0B070)',
        borderRadius: 'var(--r-md, 20px)',
        padding: '18px 18px 14px',
      }}
    >
      <SectionHeader icon="sparkles">One year, woven</SectionHeader>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '-6px 0 12px' }}>
        Your first anniversary is {when}. Pear can weave an anniversary edition —
        the rebroadcast, a year of photographs, the story one chapter longer.
      </p>
      <Link
        href={`/wizard/new?occasion=anniversary${linkParams}`}
        style={{
          display: 'flex', alignItems: 'baseline', gap: 8,
          padding: '9px 12px', borderRadius: 12,
          border: '1px solid var(--gold-line, #D0B070)', textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Begin the anniversary edition</span>
        <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>woven into the same celebration</span>
        <span aria-hidden style={{ marginLeft: 'auto', color: 'var(--gold, #C19A4B)', fontSize: 13 }}>→</span>
      </Link>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// SiblingEventsCard — the rest of the weekend.
//
// A wedding is 3-4 Pearloom sites, not one (rehearsal dinner,
// bachelor/ette, welcome party, brunch) — each often hosted by a
// different person. manifest.celebration + the siblings API have
// existed for a while, but nothing SUGGESTED the adjacent events,
// so the multi-site funnel sat unwired. This card offers the
// sibling occasions the host doesn't have a site for yet; each
// deep-links the wizard with ?occasion= prefilled.
// ─────────────────────────────────────────────────────────────
const SIBLING_EVENTS: Record<string, Array<{ occasion: string; label: string; blurb: string }>> = {
  wedding: [
    { occasion: 'rehearsal-dinner', label: 'Rehearsal dinner', blurb: 'The night before — toasts, a long table.' },
    { occasion: 'welcome-party', label: 'Welcome party', blurb: 'For everyone arriving early.' },
    { occasion: 'bachelorette-party', label: 'Bachelorette weekend', blurb: 'Itinerary, votes, one shared plan.' },
    { occasion: 'brunch', label: 'Morning-after brunch', blurb: 'Eggs before everyone flies home.' },
  ],
  engagement: [
    { occasion: 'wedding', label: 'The wedding itself', blurb: 'When you’re ready — same names, new thread.' },
    { occasion: 'bridal-shower', label: 'Bridal shower', blurb: 'Often someone else hosts — send them here.' },
  ],
};

function SiblingEventsCard({
  occasion,
  sites,
  origin,
}: {
  occasion: string;
  sites: Array<{ occasion?: string }>;
  origin: { domain?: string; names?: [string, string] | null; manifest?: unknown } | null;
}) {
  const have = new Set(sites.map((s) => s.occasion).filter(Boolean));
  const suggestions = (SIBLING_EVENTS[occasion] ?? []).filter((e) => !have.has(e.occasion)).slice(0, 3);
  /* Celebration linkage — the new site should arrive already woven
     into THIS celebration: same celebration id (reuse the origin's
     if it has one), shared name, and the LinkedEventsStrip lights
     up on both sites the moment the sibling presses. */
  const originCeleb = (origin?.manifest as { celebration?: { id?: string; name?: string } } | undefined)?.celebration;
  const celebName = originCeleb?.name
    ?? (origin?.names ?? []).filter(Boolean).join(' & ')
    ?? '';
  const linkParams = origin?.domain
    ? `&from=${encodeURIComponent(origin.domain)}`
      + (originCeleb?.id ? `&cid=${encodeURIComponent(originCeleb.id)}` : '')
      + (celebName ? `&cname=${encodeURIComponent(celebName)}` : '')
    : '';
  if (suggestions.length === 0) return null;
  return (
    <section
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--r-md, 20px)',
        padding: '18px 18px 14px',
      }}
    >
      <SectionHeader icon="sparkles">Around your day</SectionHeader>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '-6px 0 12px' }}>
        Most celebrations are a weekend, not a day. Each of these can be its own site —
        woven to match, with its own guest list.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map((e) => (
          <Link
            key={e.occasion}
            href={`/wizard/new?occasion=${encodeURIComponent(e.occasion)}${linkParams}`}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              padding: '9px 12px', borderRadius: 12,
              border: '1px dashed var(--line)', textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{e.label}</span>
            <span style={{ fontSize: 11.5, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.blurb}</span>
            <span aria-hidden style={{ marginLeft: 'auto', color: 'var(--pl-olive, #5C6B3F)', fontSize: 13 }}>→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={15} color="var(--gold)" />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>{children}</span>
      </div>
    </div>
  );
}

function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const delta = Date.now() - t;
  const min = Math.round(delta / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// CoHostInviteBanner — the invitee side of co-hosting. When the
// signed-in user has pending co-host invitations addressed to
// their email, a warm banner offers one-tap accept (no inbox dig).
// Reads /api/co-host/invitations; accepts via POST /api/sites/
// co-host { acceptToken }; on success routes into the editor.
// Renders nothing when there are no invitations.
// ─────────────────────────────────────────────────────────────
interface PendingInvite {
  token: string;
  role: string;
  roleLabel: string;
  invitedBy: string;
  note: string | null;
  siteName: string;
  siteSlug: string | null;
  occasion: string | null;
}

function CoHostInviteBanner() {
  const router = useRouter();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/co-host/invitations', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { invitations?: PendingInvite[] } | null) => {
        if (!cancelled && d?.invitations) setInvites(d.invitations);
      })
      .catch(() => { /* banner is best-effort */ });
    return () => { cancelled = true; };
  }, []);

  async function accept(inv: PendingInvite) {
    if (busyToken) return;
    setBusyToken(inv.token);
    setError(null);
    try {
      const res = await fetch('/api/sites/co-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptToken: inv.token }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || d.ok === false) throw new Error(d.error ?? `Failed (${res.status})`);
      // Into the site they just joined — or the dashboard if no slug.
      if (inv.siteSlug) router.push(`/editor/${encodeURIComponent(inv.siteSlug)}`);
      else setInvites((xs) => xs.filter((x) => x.token !== inv.token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept the invite.');
    } finally {
      setBusyToken(null);
    }
  }

  const visible = invites.filter((i) => !dismissed.has(i.token));
  if (visible.length === 0) return null;

  return (
    <div style={{ padding: '6px clamp(20px, 4vw, 40px) 0', maxWidth: 1240, margin: '0 auto' }}>
      {visible.map((inv) => {
        const inviter = inv.invitedBy ? inv.invitedBy.split('@')[0] : 'A host';
        const busy = busyToken === inv.token;
        return (
          <div
            key={inv.token}
            role="status"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              padding: '14px 18px',
              marginBottom: 12,
              borderRadius: 16,
              overflow: 'hidden',
              background: 'linear-gradient(120deg, var(--peach-bg, #FBE8D6) 0%, var(--lavender-bg, rgba(232,224,240,0.7)) 100%)',
              border: '1px solid rgba(198,112,61,0.30)',
              animation: 'pl-enter-fade-in 260ms ease both',
            }}
          >
            {/* two-strand thread along the leading edge — the brand atom */}
            <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(var(--sage-deep, #5C6B3F), var(--gold, #C19A4B))' }} />
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                width: 38, height: 38, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                background: 'var(--peach-ink, #C6703D)', color: '#fff',
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontStyle: 'italic', fontSize: 18,
              }}
            >
              ✦
            </span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)' }}>
                You&rsquo;re invited to co-host
              </div>
              <div style={{ fontSize: 15, color: 'var(--ink, #0E0D0B)', marginTop: 2, lineHeight: 1.4 }}>
                <strong style={{ fontWeight: 700 }}>{inviter}</strong> invited you to{' '}
                <span style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontStyle: 'italic' }}>{inv.siteName}</span>{' '}
                as <strong style={{ fontWeight: 700 }}>{inv.roleLabel}</strong>.
              </div>
              {error && busyToken === null && (
                <div role="alert" style={{ fontSize: 11.5, color: 'var(--pl-plum, #7A2D2D)', marginTop: 4 }}>{error}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setDismissed((s) => new Set(s).add(inv.token))}
                style={{
                  padding: '8px 12px', borderRadius: 999, border: 'none', background: 'transparent',
                  color: 'var(--ink-soft, #3A332C)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => accept(inv)}
                disabled={busy}
                style={{
                  padding: '8px 18px', borderRadius: 999, border: 'none',
                  background: 'var(--ink, #0E0D0B)', color: 'var(--cream, #F5EFE2)',
                  fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? 'Joining…' : 'Accept & open'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
