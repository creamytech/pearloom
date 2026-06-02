'use client';

/* ========================================================================
   PEARLOOM — HOME (logged-in dashboard)
   Visual-fidelity port of ClaudeDesign/pages/home-redesign.jsx (745 lines).

   Three planning stages, all real:
   - early  — far out, almost nothing done. Lavender stage pill.
   - mid    — replies trickling in. Sage stage pill.
   - late   — RSVPs closing, day-of room warming up. Peach stage pill.

   The page is laid out top-down:
   1. Custom topbar (denser than DashLayout's default) — name + View live + Open editor
   2. HeroBand — names + days-until + stage pill + next-milestone callout
                 + planning progress + "N things since you last visited"
                 + a botanical OliveSprig (Sprig) accent + Blob atmosphere
   3. QuickJumps — 4 stage-aware tiles
   4. Two-column work zone:
        Left  — PearRecommendations (3 todos) + ActivityFeed
        Right — HomeSitePreview themed vignette card (Edit / Themes)
                + GuestPulse + Milestones
   ======================================================================== */

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DashLayout } from '../dash/DashShell';
import { Icon, Pear, Sprig, Wash } from '../motifs';
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

/* ========================================================================
   HomeV8 — the actual logged-in landing dashboard.
   ======================================================================== */
export function HomeV8() {
  const { site } = useSelectedSite();
  const [insights, setInsights] = useState<GuestInsight[] | null>(null);
  const [guests, setGuests] = useState<Guest[] | null>(null);

  useEffect(() => {
    if (!site?.domain) return;
    let cancelled = false;
    fetch(`/api/guests/intelligence?siteId=${encodeURIComponent(site.domain)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { insights?: GuestInsight[] } | null) => {
        if (!cancelled && data?.insights) setInsights(data.insights);
      })
      .catch(() => {});
    fetch(`/api/guests?site=${encodeURIComponent(site.domain)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { guests?: Guest[] } | null) => {
        if (!cancelled && data?.guests) setGuests(data.guests);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [site?.domain]);

  // Derived: dates, stage, names
  const eventDate = parseLocalDate(site?.eventDate);
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

  // Guest counts
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

  const recentActivity = useMemo(() => {
    if (!guests) return [];
    return guests
      .filter((g) => g.respondedAt && (g.status === 'yes' || g.status === 'no' || g.status === 'maybe'))
      .sort((a, b) => new Date(b.respondedAt!).getTime() - new Date(a.respondedAt!).getTime())
      .slice(0, 7);
  }, [guests]);

  const pearTodos = usePearTodos({ stage, insights, guestCounts, daysUntil });
  const milestones = useMemo(
    () => buildMilestones({ stage, eventDate, eventDateShort, daysUntil, guestCounts }),
    [stage, eventDate, eventDateShort, daysUntil, guestCounts],
  );
  const nextMilestone =
    milestones.find((m) => m.status === 'urgent') ??
    milestones.find((m) => m.status === 'next') ??
    milestones.find((m) => m.status === 'upcoming') ??
    null;

  const stageBlurb =
    stage === 'early'
      ? 'Just getting started. Pear has a few ideas to get the ball rolling.'
      : stage === 'late'
      ? 'The home stretch — RSVPs are closing and the day-of room is open.'
      : "Mid-planning. Replies are landing. Keep the schedule moving.";

  return (
    <DashLayout active="home" title="Welcome back" subtitle={stageBlurb} hideTopbar>
      {/* Custom topbar — denser, more intentional than DashLayout's default.
          Matches the prototype's "Welcome back, Scott" treatment. */}
      <div
        style={{
          padding: '20px clamp(20px, 4vw, 40px) 8px',
          maxWidth: 1320,
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
          maxWidth: 1320,
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
        />

        <QuickJumps
          stage={stage}
          editorHref={editorHref}
          liveHref={liveHref}
          liveDisplay={liveDisplay}
          domain={site?.domain ?? null}
        />

        {/* Two-column work zone — verbatim from the prototype's layout. */}
        <div className="home-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PearRecommendations todos={pearTodos} />
            <ActivityFeed activity={recentActivity} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <HomeSitePreview
              names={namesArr}
              eventDateShort={eventDateShort}
              venue={site?.venue ?? null}
              editorHref={editorHref}
              liveHref={liveHref}
              hasSite={Boolean(site?.domain)}
            />
            <GuestPulse counts={guestCounts} loading={guests === null} />
            <Milestones milestones={milestones} dateShort={eventDateShort} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .home-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 960px) {
          .home-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </DashLayout>
  );
}

/* ========================================================================
   HeroBand — names + next milestone + progress
   Verbatim port of the prototype's HeroBand (lines 191–304) with the
   olive sprig botanical accent and peach Blob atmosphere preserved.
   ======================================================================== */
function HeroBand({
  namesArr,
  eventDateLabel,
  venue,
  daysUntil,
  stage,
  nextMilestone,
  progressDone,
  progressTotal,
  newSinceVisit,
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

  return (
    <div
      className="hero-band"
      style={{
        background: 'linear-gradient(180deg, var(--card, #FBF7EE) 0%, #FBF6E8 100%)',
        border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
        borderRadius: 20,
        padding: 'clamp(20px, 3vw, 28px) clamp(20px, 3vw, 32px)',
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr',
        gap: 28,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Atmosphere — peach Blob + olive Sprig. Matches the prototype's
          botanical hero accent / motif scatter. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -100,
          right: -80,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        <Wash tone="peach" size={300} opacity={0.7} />
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 18,
          right: 196,
          opacity: 0.55,
          transform: 'rotate(-8deg)',
          pointerEvents: 'none',
        }}
      >
        <Sprig size={130} color="var(--sage, #8B9C5A)" accent="var(--gold, #B8935A)" />
      </div>

      {/* LEFT — names + meta */}
      <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <span
            className="eyebrow"
            style={{
              color: 'var(--peach-ink)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {daysUntil == null
              ? 'Your celebration'
              : daysUntil === 0
              ? 'Today'
              : `${daysUntil} days until`}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 600,
              background: stagePill.bg,
              color: stagePill.fg,
            }}
          >
            {stagePill.label}
          </span>
        </div>
        <h2
          className="display"
          style={{
            fontSize: 'clamp(32px, 4.4vw, 52px)',
            margin: 0,
            lineHeight: 0.98,
            fontWeight: 500,
            letterSpacing: '-0.02em',
          }}
        >
          {namesArr.length >= 2 ? (
            <>
              {namesArr[0]}{' '}
              <span className="display-italic" style={{ color: 'var(--ink)', fontStyle: 'italic', fontWeight: 400 }}>
                &amp;
              </span>{' '}
              {namesArr[1]}
            </>
          ) : (
            namesArr[0] ?? 'Your celebration'
          )}
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
              <span style={{ width: 3, height: 3, background: 'var(--ink-muted)', borderRadius: '50%' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="pin" size={13} /> {venue}
              </span>
            </>
          )}
        </div>
      </div>

      {/* MIDDLE — next milestone */}
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
            <div
              className="eyebrow"
              style={{
                color: urgencyColor,
                marginBottom: 4,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Next up
            </div>
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
            <span
              className="eyebrow"
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}
            >
              Planning
            </span>
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
            <strong style={{ fontWeight: 700 }}>{newSinceVisit}</strong>{' '}
            {newSinceVisit === 1 ? 'thing' : 'things'} since you last visited
            <Icon name="arrow-right" size={13} style={{ marginLeft: 'auto' }} />
          </a>
        ) : (
          <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', padding: '8px 12px' }}>
            All quiet. Pear&apos;s keeping watch.
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 960px) {
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
  mid:   { label: 'Mid-planning',         bg: 'var(--sage-tint)',   fg: 'var(--sage-deep)'    },
  late:  { label: 'Final stretch',        bg: 'var(--peach-bg)',    fg: 'var(--peach-ink)'    },
};

/* ========================================================================
   QuickJumps — 4 stage-aware tiles
   Verbatim port of the prototype's QuickJumps (lines 584–632).
   ======================================================================== */
interface JumpTile {
  label: string;
  sub: string;
  icon: string;
  href: string;
  glow?: boolean;
  dim?: boolean;
}

function QuickJumps({
  stage,
  editorHref,
  liveHref,
  liveDisplay,
  domain,
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
        { label: 'Open the editor',  sub: 'Edit your wedding site',           icon: 'brush',    href: editorHref },
        { label: 'Build guest list', sub: 'Import or draft with Pear',        icon: 'users',    href: '/dashboard/invite' },
        { label: 'Studio',           sub: 'Save-the-dates & invites',         icon: 'palette',  href: '/dashboard/print' },
        { label: 'Day-of room',      sub: 'Locked until 30 days out',         icon: 'lock',     href: '/dashboard/day-of', dim: true },
      ];
    }
    if (stage === 'late') {
      return [
        { label: 'Day-of room',      sub: 'Open now — timeline & vendors',    icon: 'calendar', href: '/dashboard/day-of', glow: true },
        { label: 'Seating chart',    sub: 'Place guests at tables',           icon: 'grid',     href: '/dashboard/seating' },
        { label: 'Open the editor',  sub: 'Final tweaks to the site',         icon: 'brush',    href: editorHref },
        { label: 'Print orders',     sub: 'Programs ready to send',           icon: 'send',     href: '/dashboard/print' },
      ];
    }
    return [
      { label: 'Open the editor',  sub: 'Edit your wedding site',              icon: 'brush',   href: editorHref },
      { label: 'Send invitations', sub: 'Pear has cadences ready',             icon: 'send',    href: '/dashboard/cadence' },
      { label: 'Studio',           sub: 'Save-the-dates & invites',            icon: 'palette', href: '/dashboard/print' },
      { label: 'View live site',   sub: domain ? liveDisplay : 'Publish to share', icon: 'eye', href: liveHref },
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

/* ========================================================================
   HomeSitePreview — a themed vignette of the couple's actual site.
   This is the prototype's signature card (lines 33–65). Renders a
   small "Save the date" preview with motif scatter + olive-sprig
   accents and two pill actions: Edit / Themes.
   ======================================================================== */
function HomeSitePreview({
  names,
  eventDateShort,
  venue,
  editorHref,
  liveHref,
  hasSite,
}: {
  names: string[];
  eventDateShort: string | null;
  venue: string | null;
  editorHref: string;
  liveHref: string;
  hasSite: boolean;
}) {
  const [a, b] = names;
  return (
    <div
      className="card"
      style={{
        padding: 16,
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
        borderRadius: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="eye" size={15} color="var(--gold)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>Your site</span>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--sage-deep)',
              background: 'var(--sage-tint)',
              padding: '2px 8px',
              borderRadius: 999,
            }}
          >
            Santorini
          </span>
        </div>
        {hasSite ? (
          <a
            href={liveHref}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none' }}
          >
            View live
          </a>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Not published</span>
        )}
      </div>

      {/* The vignette — themed mini hero with a motif scatter */}
      <div
        style={{
          position: 'relative',
          height: 188,
          borderRadius: 14,
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, #F1EDDE 0%, #E9E2C9 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '22px 18px',
          border: '1px solid var(--line-soft, rgba(14,13,11,0.06))',
        }}
      >
        {/* Motif scatter — olive sprig top-left (mirrored) + top-right */}
        <div
          aria-hidden
          style={{ position: 'absolute', top: 10, left: 12, opacity: 0.55, transform: 'scaleX(-1)' }}
        >
          <Sprig size={48} color="var(--sage-deep, #5C6B3F)" />
        </div>
        <div aria-hidden style={{ position: 'absolute', top: 10, right: 12, opacity: 0.55 }}>
          <Sprig size={48} color="var(--sage-deep, #5C6B3F)" />
        </div>

        {/* Centered themed content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--sage-deep, #5C6B3F)',
              marginBottom: 7,
            }}
          >
            Save the date
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 30,
              lineHeight: 0.98,
              color: 'var(--ink, #2A2A28)',
            }}
          >
            {a ?? 'Someone'}
            <span
              style={{
                fontStyle: 'italic',
                fontSize: '0.6em',
                color: 'var(--ink-soft)',
                margin: '0 0.16em',
                fontWeight: 400,
              }}
            >
              &amp;
            </span>
            {b ?? 'Someone'}
          </div>
          {/* Mini divider — a delicate hairline with three berries */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '9px 0' }}>
            <svg width={120} height={10} viewBox="0 0 120 10" aria-hidden>
              <line x1="2" y1="5" x2="48" y2="5" stroke="var(--gold, #B8935A)" strokeWidth="1" strokeLinecap="round" />
              <circle cx="56" cy="5" r="1.6" fill="var(--gold, #B8935A)" />
              <circle cx="64" cy="5" r="1.6" fill="var(--gold, #B8935A)" />
              <circle cx="72" cy="5" r="1.6" fill="var(--gold, #B8935A)" />
              <line x1="80" y1="5" x2="118" y2="5" stroke="var(--gold, #B8935A)" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
            {eventDateShort ?? 'Date pending'}
            {venue ? ` · ${venue}` : ''}
          </div>
        </div>
      </div>

      {/* Action pills — Edit / Themes */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Link
          href={editorHref}
          className="btn btn-outline btn-sm"
          style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
        >
          <Icon name="brush" size={12} /> Edit
        </Link>
        <Link
          href="/store"
          className="btn btn-outline btn-sm"
          style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
        >
          <Icon name="sparkles" size={12} /> Themes
        </Link>
      </div>
    </div>
  );
}

/* ========================================================================
   PearRecommendations — Pear's 3 "worth your minute" todos
   Verbatim port of the prototype's PearRecommendations (lines 308–363).
   ======================================================================== */
interface PearTodo {
  title: string;
  sub: string;
  cta: string;
  href: string;
  urgency: 'now' | 'soon' | 'later';
}

function usePearTodos({
  stage,
  insights,
  guestCounts,
  daysUntil,
}: {
  stage: Stage;
  insights: GuestInsight[] | null;
  guestCounts: { invited: number; yes: number; no: number; maybe: number; pending: number } | null;
  daysUntil: number | null;
}): PearTodo[] {
  return useMemo(() => {
    const out: PearTodo[] = [];

    const ordered = insights
      ? [...insights].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
      : [];
    for (const ins of ordered.slice(0, 2)) {
      out.push({
        title: ins.title,
        sub: ins.detail,
        cta: ins.action?.label ?? 'Review',
        href: '/dashboard/guest-review',
        urgency: ins.severity === 'urgent' ? 'now' : ins.severity === 'attention' ? 'soon' : 'later',
      });
    }

    if (stage === 'early') {
      if (out.length < 3)
        out.push({
          title: 'Build your guest list',
          sub: 'Pear can suggest one from your story, or import contacts.',
          cta: 'Start with Pear',
          href: '/dashboard/invite',
          urgency: 'now',
        });
      if (out.length < 3)
        out.push({
          title: 'Pick a save-the-date',
          sub: 'Three styles ready to try in the studio.',
          cta: 'Preview',
          href: '/dashboard/print',
          urgency: 'soon',
        });
    } else if (stage === 'late') {
      if (out.length < 3 && guestCounts && guestCounts.pending > 0)
        out.push({
          title: `Chase ${guestCounts.pending} pending RSVP${guestCounts.pending === 1 ? '' : 's'}`,
          sub: daysUntil != null
            ? `${daysUntil} days until the date. Pear has a final-reminder draft.`
            : 'Pear has a final-reminder draft ready.',
          cta: 'Send for me',
          href: '/dashboard/cadence',
          urgency: 'now',
        });
      if (out.length < 3)
        out.push({
          title: 'Day-of timeline',
          sub: 'Vendors, run-of-show, and a single source of truth.',
          cta: 'Open Day-of',
          href: '/dashboard/day-of',
          urgency: 'soon',
        });
    } else {
      if (out.length < 3 && guestCounts && guestCounts.pending > 0)
        out.push({
          title: 'Send a reminder cadence',
          sub: `${guestCounts.pending} guest${guestCounts.pending === 1 ? '' : 's'} haven't replied yet.`,
          cta: 'Review draft',
          href: '/dashboard/cadence',
          urgency: 'soon',
        });
      if (out.length < 3)
        out.push({
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

function PearRecommendations({ todos }: { todos: PearTodo[] }) {
  if (todos.length === 0) return null;
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pear size={28} tone="sage" sparkle shadow={false} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, lineHeight: 1 }}>
              From Pear
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>
              {todos.length} {todos.length === 1 ? 'thing' : 'things'} I think are worth your minute
            </div>
          </div>
        </div>
        <span
          style={{ fontSize: 12.5, color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          Ask Pear <Icon name="sparkles" size={12} color="var(--gold)" />
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {todos.map((it, i) => {
          const urgent = it.urgency === 'now';
          const stripeColor =
            it.urgency === 'now'
              ? 'var(--peach-ink)'
              : it.urgency === 'soon'
              ? 'var(--lavender-2)'
              : 'var(--sage)';
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

/* ========================================================================
   ActivityFeed — recent RSVPs as a vertical timeline
   Verbatim port of the prototype's ActivityFeed (lines 367–422).
   ======================================================================== */
function ActivityFeed({ activity }: { activity: Guest[] }) {
  return (
    <div
      className="card"
      id="feed"
      style={{
        padding: 20,
        borderRadius: 20,
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
      }}
    >
      <SectionHeader icon="bell">Activity</SectionHeader>
      {activity.length === 0 ? (
        <div
          style={{
            padding: '24px 8px',
            fontSize: 13,
            color: 'var(--ink-muted)',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Nothing yet. As guests RSVP, leave notes, or Pear acts on your behalf, it&apos;ll show up here.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* timeline line */}
          <div
            style={{
              position: 'absolute',
              left: 17,
              top: 8,
              bottom: 8,
              width: 1.5,
              background: 'var(--line-soft)',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activity.map((g) => {
              const declined = g.status === 'no' || g.status === 'declined';
              const tone = declined
                ? { bg: 'var(--cream-2)', fg: 'var(--ink-soft)' }
                : { bg: 'var(--sage-tint)', fg: 'var(--sage-deep)' };
              const verb =
                g.status === 'yes' || g.status === 'attending'
                  ? 'said yes'
                  : declined
                  ? 'declined'
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
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: tone.bg,
                      color: tone.fg,
                      display: 'grid',
                      placeItems: 'center',
                      position: 'relative',
                      zIndex: 1,
                      border: '2px solid var(--card)',
                    }}
                  >
                    <Icon name="check" size={15} color={tone.fg} />
                  </div>
                  <div style={{ minWidth: 0, paddingTop: 6 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.4 }}>
                      <strong style={{ fontWeight: 600 }}>{g.name}</strong> {verb}
                      {g.plusOneName ? (
                        <>
                          {' '}
                          — bringing +1 (<em style={{ fontStyle: 'normal' }}>{g.plusOneName}</em>)
                        </>
                      ) : null}
                    </div>
                    {g.message && (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--ink-muted)',
                          marginTop: 2,
                          fontStyle: 'italic',
                        }}
                      >
                        &ldquo;{g.message}&rdquo;
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--ink-muted)',
                      paddingTop: 8,
                      whiteSpace: 'nowrap',
                    }}
                  >
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

/* ========================================================================
   GuestPulse — % responded + stacked bar
   Verbatim port of the prototype's GuestPulse (lines 426–501).
   ======================================================================== */
function GuestPulse({
  counts,
  loading,
}: {
  counts: { invited: number; yes: number; no: number; maybe: number; pending: number } | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div
        className="card"
        style={{
          padding: 20,
          borderRadius: 20,
          background: 'var(--card, #FBF7EE)',
          border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
          fontSize: 13,
          color: 'var(--ink-muted)',
          fontStyle: 'italic',
        }}
      >
        Threading…
      </div>
    );
  }
  if (!counts || counts.invited === 0) {
    return (
      <div
        className="card"
        style={{
          padding: 20,
          borderRadius: 20,
          background: 'var(--card, #FBF7EE)',
          border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
        }}
      >
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
    <div
      className="card"
      style={{
        padding: 20,
        borderRadius: 20,
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="users" size={15} color="var(--gold)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>Guests</span>
        </div>
        <Link href="/rsvps" style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none' }}>
          Open Guests
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, lineHeight: 1 }}>
          {respondedPct}
          <span style={{ fontSize: 18, color: 'var(--ink-muted)' }}>%</span>
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
        {segs.map(
          (s) =>
            s.val > 0 && (
              <div
                key={s.label}
                style={{ flex: s.val, background: s.color, transition: 'flex 400ms ease' }}
                title={`${s.label}: ${s.val}`}
              />
            ),
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {segs.map((s) => (
          <div key={s.label} style={{ padding: '8px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
              <span
                style={{
                  fontSize: 10.5,
                  color: 'var(--ink-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {s.label}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            >
              {s.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================
   Milestones — vertical roadmap
   Verbatim port of the prototype's Milestones (lines 506–566) with the
   five status states (done / urgent / next / upcoming / distant).
   ======================================================================== */
type MilestoneStatus = 'done' | 'urgent' | 'next' | 'upcoming' | 'distant';
interface Milestone {
  date: string;
  label: string;
  sub: string;
  status: MilestoneStatus;
  urgency: 'urgent' | 'soon' | 'on-track';
}

function buildMilestones({
  stage,
  eventDate,
  eventDateShort,
  daysUntil,
  guestCounts,
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
    out.push({ date: '~4 mo', label: 'Book vendors', sub: 'in roughly four months', status: 'upcoming', urgency: 'on-track' });
    out.push({ date: '~10 mo', label: 'Send invitations', sub: 'with the guest list', status: 'upcoming', urgency: 'on-track' });
  } else if (stage === 'mid') {
    if (guestCounts && guestCounts.invited > 0) {
      out.push({
        date: 'Done',
        label: 'Save-the-dates sent',
        sub: `${guestCounts.invited} invited`,
        status: 'done',
        urgency: 'on-track',
      });
    }
    out.push({
      date: 'Soon',
      label: 'RSVP cutoff',
      sub: daysUntil ? `~${Math.max(30, Math.round(daysUntil / 4))} days out` : '~30 days',
      status: 'next',
      urgency: 'soon',
    });
    out.push({ date: 'Later', label: 'Final menu count', sub: 'caterer needs the headcount', status: 'upcoming', urgency: 'on-track' });
    out.push({ date: 'Later', label: 'Seating chart', sub: 'after RSVPs close', status: 'upcoming', urgency: 'on-track' });
  } else if (stage === 'late') {
    if (guestCounts && guestCounts.invited > 0) {
      out.push({
        date: 'Done',
        label: 'Invitations sent',
        sub: `${guestCounts.invited} invited`,
        status: 'done',
        urgency: 'on-track',
      });
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
    out.push({ date: 'Soon', label: 'Seating finalized', sub: 'place every name', status: 'upcoming', urgency: 'on-track' });
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
    <div
      className="card"
      style={{
        padding: 20,
        borderRadius: 20,
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
      }}
    >
      <SectionHeader icon="calendar">{dateShort ? `The road to ${dateShort}` : 'Your timeline'}</SectionHeader>
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
                    m.status === 'urgent'
                      ? 'var(--peach-ink)'
                      : m.status === 'done'
                      ? 'var(--sage-deep)'
                      : 'var(--ink-muted)',
                  textTransform: m.status === 'done' || m.status === 'urgent' ? 'uppercase' : 'none',
                  letterSpacing: m.status === 'done' || m.status === 'urgent' ? '0.05em' : 0,
                }}
              >
                {m.date}
              </div>

              <div style={{ position: 'relative', display: 'grid', placeItems: 'center', height: 22 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: dot.bg,
                    border: `2px solid ${dot.border}`,
                    display: 'grid',
                    placeItems: 'center',
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

function milestoneDotStyle(status: MilestoneStatus): {
  bg: string;
  border: string;
  check: boolean;
  pulse: boolean;
} {
  if (status === 'done')    return { bg: 'var(--sage)',       border: 'var(--sage)',       check: true,  pulse: false };
  if (status === 'urgent')  return { bg: 'var(--peach-ink)',  border: 'var(--peach-ink)',  check: false, pulse: true  };
  if (status === 'next')    return { bg: 'var(--card)',       border: 'var(--ink)',        check: false, pulse: false };
  if (status === 'distant') return { bg: 'var(--ink)',        border: 'var(--ink)',        check: false, pulse: false };
  return                          { bg: 'var(--card)',       border: 'var(--ink-muted)',  check: false, pulse: false };
}

/* ========================================================================
   Helpers
   ======================================================================== */
function SectionHeader({
  icon,
  children,
  extra,
}: {
  icon: string;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={15} color="var(--gold)" />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>{children}</span>
      </div>
      {extra}
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

