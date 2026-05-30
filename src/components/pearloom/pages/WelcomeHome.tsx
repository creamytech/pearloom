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
import { DashLayout } from '../dash/DashShell';
import { Icon, Pear } from '../motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { parseLocalDate } from '@/lib/date-utils';
import { buildSiteUrl, formatSiteDisplayUrl } from '@/lib/site-urls';
import type { GuestInsight } from '@/app/api/guests/intelligence/route';

interface Guest {
  id: string;
  name: string;
  status: 'pending' | 'yes' | 'no' | 'maybe' | string;
  respondedAt?: string | null;
  message?: string | null;
  plusOneName?: string | null;
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
  const { site } = useSelectedSite();
  const [insights, setInsights] = useState<GuestInsight[] | null>(null);
  const [guests, setGuests] = useState<Guest[] | null>(null);

  useEffect(() => {
    if (!site?.domain) return;
    let cancelled = false;
    fetch(`/api/guests/intelligence?siteId=${encodeURIComponent(site.domain)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { insights?: GuestInsight[] } | null) => {
        if (!cancelled && data?.insights) setInsights(data.insights);
      })
      .catch(() => {});
    fetch(`/api/guests?site=${encodeURIComponent(site.domain)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { guests?: Guest[] } | null) => {
        if (!cancelled && data?.guests) setGuests(data.guests);
      })
      .catch(() => {});
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
  const daysUntil = eventDate
    ? Math.max(0, Math.round((eventDate.getTime() - now) / 86_400_000))
    : null;
  const eventDateLabel = eventDate
    ? eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const eventDateShort = eventDate
    ? eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const stage = stageFromDaysUntil(daysUntil);
  const namesArr = (site?.names ?? []).filter(Boolean) as string[];
  const firstName = namesArr[0] ?? 'friend';
  const occasion = site?.occasion ?? 'wedding';
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

  // ── Pear recommendations ────────────────────────────────────
  const pearTodos = usePearTodos({ stage, insights, guestCounts, daysUntil });

  // ── Next milestone (drives the hero callout) ────────────────
  const milestones = useMemo(
    () => buildMilestones({ stage, eventDate, eventDateShort, daysUntil, guestCounts }),
    [stage, eventDate, eventDateShort, daysUntil, guestCounts],
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
      {/* Custom topbar — denser, more intentional than DashLayout's default */}
      {/* Custom topbar — matches the canonical dashboard horizontal
          padding (20-40px clamp) instead of the prior 20-32 clamp
          so the title aligns with the section content below it. */}
      <div
        style={{
          padding: '20px clamp(20px, 4vw, 40px) 8px',
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            className="display"
            style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              lineHeight: 1.05,
            }}
          >
            Welcome back, {firstName}
          </h1>
          <div style={{ marginTop: 4, fontSize: 14, color: 'var(--ink-soft)' }}>{stageBlurb}</div>
        </div>
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
          progressDone={milestones.filter((m) => m.status === 'done').length}
          progressTotal={milestones.length}
          newSinceVisit={recentActivity.length}
          liveDisplay={liveDisplay}
        />

        <QuickJumps stage={stage} editorHref={editorHref} liveHref={liveHref} liveDisplay={liveDisplay} domain={site?.domain ?? null} />

        {/* Two-column work zone — same shape as the design.
            Stacks below 920px so phones get a single column. */}
        <div className="welcome-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PearRecommendations todos={pearTodos} domain={site?.domain ?? null} />
            <ActivityFeed activity={recentActivity} stage={stage} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GuestPulse counts={guestCounts} domain={site?.domain ?? null} loading={guests === null} />
            <Milestones milestones={milestones} dateShort={eventDateShort} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .welcome-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 920px) {
          .welcome-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
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
  void firstName; void liveDisplay;

  return (
    <div
      className="hero-band"
      style={{
        background: 'linear-gradient(180deg, var(--card, #FBF7EE) 0%, #FBF6E8 100%)',
        border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
        borderRadius: 20,
        padding: 'clamp(20px, 3vw, 28px)',
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr',
        gap: 28,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Atmosphere glyph — gold thread squiggle, decorative only */}
      <svg
        width="160"
        height="40"
        viewBox="0 0 160 40"
        aria-hidden
        style={{
          position: 'absolute',
          top: 22,
          right: 220,
          opacity: 0.45,
          transform: 'rotate(-10deg)',
          pointerEvents: 'none',
          color: 'var(--gold-line, #D4A95D)',
        }}
      >
        <path d="M2 20 Q 20 4 38 20 T 74 20 T 110 20 T 146 20" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      </svg>

      {/* LEFT — names + meta */}
      <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
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
          className="display"
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

      {/* MIDDLE — next milestone callout */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {nextMilestone ? (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 16,
              background: urgencyBg,
              border: `1px solid ${urgencyTone === 'peach' ? 'rgba(198,112,61,0.18)' : 'transparent'}`,
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
              borderRadius: 16,
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span className="eyebrow">PLANNING</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
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
        { label: 'Build guest list', sub: 'Import or draft with Pear',                   icon: 'users',   href: '/dashboard/invite' },
        { label: 'Studio',           sub: 'Save-the-dates & invites',                    icon: 'palette', href: '/dashboard/print' },
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
      { label: 'Studio',           sub: 'Save-the-dates & invites',                        icon: 'palette', href: '/dashboard/print' },
      { label: 'View live site',   sub: domain ? liveDisplay : 'Publish to share',         icon: 'eye',   href: liveHref },
    ];
  })();

  return (
    <div className="qj-grid">
      {tiles.map((j) => (
        <Link
          key={j.label}
          href={j.href}
          className="lift"
          style={{
            padding: '14px 16px',
            borderRadius: 14,
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
      <style jsx>{`
        .qj-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 760px) {
          .qj-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
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
  stage, insights, guestCounts, daysUntil,
}: {
  stage: Stage;
  insights: GuestInsight[] | null;
  guestCounts: { invited: number; yes: number; no: number; maybe: number; pending: number } | null;
  daysUntil: number | null;
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
        href: '/dashboard/invite',
        urgency: 'now',
      });
      if (out.length < 3) out.push({
        title: 'Pick a save-the-date',
        sub: 'Three styles ready to try in the studio.',
        cta: 'Preview',
        href: '/dashboard/print',
        urgency: 'soon',
      });
    } else if (stage === 'late') {
      if (out.length < 3 && guestCounts && guestCounts.pending > 0) out.push({
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
      if (out.length < 3 && guestCounts && guestCounts.pending > 0) out.push({
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
  }, [stage, insights, guestCounts, daysUntil]);
}

function severityRank(s: GuestInsight['severity']): number {
  return s === 'urgent' ? 0 : s === 'attention' ? 1 : 2;
}

function PearRecommendations({ todos, domain }: { todos: PearTodo[]; domain: string | null }) {
  void domain;
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
        borderRadius: 20,
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
                gridTemplateColumns: '6px 1fr auto',
                gap: 14,
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 12,
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
                style={{ textDecoration: 'none' }}
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
          <div style={{ position: 'absolute', left: 17, top: 8, bottom: 8, width: 1.5, background: 'var(--line-soft)' }} />
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
  if (loading) {
    return (
      <div className="card" style={{ padding: 20, borderRadius: 20, fontSize: 13, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
        Threading…
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
            borderRadius: 14,
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 6 }}>No guests yet</div>
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
            <Link href="/dashboard/invite" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              Start with Pear <Icon name="sparkles" size={11} color="var(--cream)" />
            </Link>
            <Link href="/dashboard/invite" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
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
          href="/rsvps"
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
            style={{ flex: s.val, background: s.color, transition: 'flex 400ms ease' }}
            title={`${s.label}: ${s.val}`}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
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
  stage, eventDate, eventDateShort, daysUntil, guestCounts,
}: {
  stage: Stage;
  eventDate: Date | null;
  eventDateShort: string | null;
  daysUntil: number | null;
  guestCounts: { invited: number; yes: number; no: number; maybe: number; pending: number } | null;
}): Milestone[] {
  const out: Milestone[] = [];
  out.push({ date: 'Done', label: 'Site claimed', sub: '', status: 'done', urgency: 'on-track' });
  if (eventDate) {
    out.push({ date: 'Done', label: 'Date locked', sub: eventDateShort ?? '', status: 'done', urgency: 'on-track' });
  } else {
    out.push({ date: 'Now', label: 'Lock the date', sub: 'Anchors every milestone', status: 'next', urgency: 'soon' });
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
                gridTemplateColumns: '76px 22px 1fr auto',
                gap: 12,
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
                  {dot.check && <Icon name="check" size={8} color="white" strokeWidth={3} />}
                </span>
              </div>
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
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{m.sub}</div>
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
