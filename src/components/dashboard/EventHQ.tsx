'use client';

// ─────────────────────────────────────────────────────────────
// EventHQ — Wave C "calm mission control" for a single site.
// Shown when the user has selected an active site. Pulls the
// most-asked questions to the foreground:
//   • countdown · checklist progress · RSVP velocity
//   • next-best-action (Pear suggests)
//   • upcoming agenda · vendor next step
// ─────────────────────────────────────────────────────────────

import { ReactNode, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Briefcase,
  Sparkles,
  ArrowUpRight,
  Megaphone,
  Image as ImageIcon,
  Camera,
  Edit3,
  Mic,
} from 'lucide-react';
import { StatTile, Button } from '@/components/shell';
import { formatSiteDisplayUrl } from '@/lib/site-urls';
import { BlurFade, GrooveBlob } from '@/components/brand/groove';

export interface EventHQSite {
  id: string;
  domain: string;
  names?: [string, string];
  occasion?: string;
  eventDate?: string;
  rsvpStats?: {
    attending: number;
    declined: number;
    pending: number;
    total: number;
  };
  vendorCount?: number;
  galleryCount?: number;
}

interface EventHQProps {
  site: EventHQSite;
  onEdit?: () => void;
  onShare?: () => void;
}

export function EventHQ({ site, onEdit, onShare }: EventHQProps) {
  const titleNames = site.names?.filter(Boolean).join(' & ') || site.domain;

  const daysUntil = useMemo(() => {
    if (!site.eventDate) return null;
    const event = new Date(site.eventDate).getTime();
    const now = Date.now();
    const diff = Math.ceil((event - now) / (1000 * 60 * 60 * 24));
    return diff;
  }, [site.eventDate]);

  const rsvp = site.rsvpStats ?? { attending: 0, declined: 0, pending: 0, total: 0 };
  const rsvpRate = rsvp.total > 0 ? Math.round(((rsvp.attending + rsvp.declined) / rsvp.total) * 100) : 0;

  const year = new Date().getFullYear();

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 36, maxWidth: 1180, margin: '0 auto' }}>
      {/* Ambient warmth — two groove blobs drifting behind the hq */}
      <GrooveBlob
        palette="sunrise"
        size={460}
        blur={80}
        opacity={0.24}
        style={{ position: 'absolute', top: '-100px', right: '-60px', zIndex: 0, pointerEvents: 'none' }}
      />
      <GrooveBlob
        palette="orchard"
        size={340}
        blur={70}
        opacity={0.18}
        style={{ position: 'absolute', top: '45%', left: '-80px', zIndex: 0, pointerEvents: 'none' }}
      />

      {/* ── Editorial masthead ─────────────────────────────────── */}
      <BlurFade>
      <header
        style={{
          position: 'relative',
          zIndex: 1,
          paddingTop: 20,
          paddingBottom: 28,
          borderBottom: '1px solid color-mix(in oklab, var(--pl-groove-terra) 22%, transparent)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background:
              'linear-gradient(90deg, var(--pl-groove-terra) 0%, var(--pl-groove-butter) 40%, transparent 75%)',
            borderRadius: 'var(--pl-groove-radius-pill)',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <div
              style={{
                fontFamily: 'var(--pl-font-body)',
                fontSize: '0.92rem',
                fontWeight: 500,
                color: 'var(--pl-groove-terra)',
                marginBottom: 10,
              }}
            >
              Your headquarters for this one.
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--pl-font-body)',
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                color: 'var(--pl-groove-ink)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                fontWeight: 700,
              }}
            >
              {titleNames}
            </h1>
            {/* Meta — sentence-case, mid-weight body copy. */}
            <div
              style={{
                marginTop: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                fontFamily: 'var(--pl-font-body)',
                fontSize: '0.92rem',
                color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
              }}
            >
              <span style={{ color: 'var(--pl-groove-terra)', fontWeight: 600, textTransform: 'capitalize' }}>
                {site.occasion || 'Event'}
              </span>
              {site.eventDate && (
                <>
                  <span style={{ color: 'color-mix(in oklab, var(--pl-groove-ink) 35%, transparent)' }}>·</span>
                  <span>{formatEventDate(site.eventDate)}</span>
                </>
              )}
              <span style={{ color: 'color-mix(in oklab, var(--pl-groove-ink) 35%, transparent)' }}>·</span>
              <span>
                {formatSiteDisplayUrl(site.domain, '', site.occasion)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare} leftIcon={<ArrowUpRight size={16} />}>
                Share site
              </Button>
            )}
            {onEdit && (
              <Button variant="primary" size="sm" onClick={onEdit} leftIcon={<Edit3 size={16} />}>
                Edit site
              </Button>
            )}
          </div>
        </div>
      </header>
      </BlurFade>

      {/* ── Stat row ───────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--pl-font-body)',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--pl-groove-ink)',
              letterSpacing: '-0.01em',
            }}
          >
            Guests at a glance
          </h3>
        </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <StatTile
          accent="olive"
          icon={<Calendar size={16} />}
          label="Countdown"
          value={
            daysUntil != null ? (
              <span>
                {Math.max(daysUntil, 0)}
                <em
                  style={{
                    fontSize: '1.1rem',
                    color: 'var(--pl-olive)',
                    marginLeft: 6,
                    fontStyle: 'italic',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  {Math.abs(daysUntil) === 1 ? 'day' : 'days'}
                </em>
              </span>
            ) : (
              <span style={{ color: 'var(--pl-muted)' }}>Set date</span>
            )
          }
          hint={daysUntil != null ? (daysUntil < 0 ? 'past · archive ready' : 'until showtime') : 'no date set'}
        />
        <StatTile
          accent="gold"
          icon={<Users size={16} />}
          label="RSVPs"
          value={
            rsvp.total > 0 ? (
              <span>
                {rsvp.attending}
                <em
                  style={{
                    fontSize: '1.1rem',
                    color: 'var(--pl-muted)',
                    marginLeft: 6,
                    fontStyle: 'italic',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  / {rsvp.total}
                </em>
              </span>
            ) : (
              <span style={{ color: 'var(--pl-muted)' }}>—</span>
            )
          }
          hint={rsvp.total > 0 ? `${rsvpRate}% responded · ${rsvp.pending} pending` : 'no guests yet'}
          trend={rsvp.attending > 0 ? { dir: 'up', label: `${rsvp.attending} in` } : undefined}
        />
        <StatTile
          accent="plum"
          icon={<Briefcase size={16} />}
          label="Vendors"
          value={site.vendorCount ?? 0}
          hint="bookings tracked"
        />
        <StatTile
          accent="none"
          icon={<ImageIcon size={16} />}
          label="Gallery"
          value={site.galleryCount ?? 0}
          hint="moments captured"
        />
      </div>
      </section>

      {/* ── Pear suggests + Quick lanes ───────────────────────── */}
      <section
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 24,
        }}
        className="pl-eventhq-grid"
      >
        <PearSuggestCard site={site} />
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.48rem',
                fontWeight: 700,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--pl-olive)',
              }}
            >
              Quick lanes
            </div>
            <span
              style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--pl-muted)',
              }}
            >
              Four routes
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0,
              border: '1px solid var(--pl-divider)',
              borderTop: '2px solid var(--pl-gold)',
              borderRadius: 'var(--pl-radius-xs)',
              background: 'var(--pl-cream-card)',
              overflow: 'hidden',
            }}
          >
            <QuickLane
              index={1}
              href="/dashboard/day-of"
              icon={<Megaphone size={16} />}
              label="Day-of"
              hint="Run of show + announcements"
              accent="olive"
            />
            <QuickLane
              index={2}
              href="/dashboard/rsvp"
              icon={<Users size={16} />}
              label="Guest list"
              hint="Seats, dietary, plus-ones"
              accent="gold"
              divider
            />
            <QuickLane
              index={3}
              href="/dashboard/gallery"
              icon={<Camera size={16} />}
              label="Gallery"
              hint="Curate the album"
              accent="plum"
              topBorder
            />
            <QuickLane
              index={4}
              href="/dashboard/director"
              icon={<Sparkles size={16} />}
              label="Director"
              hint="Talk to Pear"
              accent="olive"
              divider
              topBorder
            />
          </div>
        </div>
      </section>

      {/* ── Run of show ────────────────────────────────────────── */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid var(--pl-divider)',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.48rem',
                fontWeight: 700,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--pl-olive)',
                marginBottom: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--pl-olive)',
                  boxShadow: '0 0 0 4px rgba(131,136,77,0.18)',
                }}
              />
              Today · Live
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--pl-font-display)',
                fontStyle: 'italic',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                fontSize: '1.7rem',
                letterSpacing: '-0.01em',
                color: 'var(--pl-ink)',
              }}
            >
              Run of show
            </h2>
          </div>
          <Link
            href="/dashboard/day-of"
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'var(--pl-olive)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Open full <ArrowUpRight size={11} />
          </Link>
        </div>
        <div
          style={{
            border: '1px solid var(--pl-divider)',
            borderTop: '2px solid var(--pl-gold)',
            borderRadius: 'var(--pl-radius-xs)',
            background: 'var(--pl-cream-card)',
            overflow: 'hidden',
          }}
        >
          <RunOfShow />
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 880px) {
          :global(.pl-eventhq-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatEventDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────

function PearSuggestCard({ site }: { site: EventHQSite }) {
  const suggestion = computeSuggestion(site);
  return (
    <article
      style={{
        position: 'relative',
        padding: '28px 30px',
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        borderRadius: 'var(--pl-radius-xs)',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'var(--pl-gold)',
        }}
      />
      {/* Corner tag */}
      <span
        style={{
          position: 'absolute',
          top: 12,
          right: 16,
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.48rem',
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--pl-gold)',
        }}
      >
        Editor&apos;s pick
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.48rem',
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--pl-olive)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'color-mix(in oklab, var(--pl-gold) 14%, transparent)',
              color: 'var(--pl-gold)',
            }}
          >
            <Sparkles size={11} />
          </span>
          Pear suggests
        </div>

        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--pl-font-display)',
            fontStyle: 'italic',
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            fontSize: 'clamp(1.5rem, 2.6vw, 2rem)',
            color: 'var(--pl-ink)',
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
            maxWidth: '22ch',
          }}
        >
          {suggestion.title}
        </h3>

        <p
          style={{
            margin: 0,
            color: 'var(--pl-ink-soft)',
            fontSize: '0.96rem',
            lineHeight: 1.6,
            maxWidth: '54ch',
          }}
        >
          {suggestion.description}
        </p>

        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 6,
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: 'var(--pl-ink)',
              color: 'var(--pl-cream)',
              border: 'none',
              borderRadius: 'var(--pl-radius-xs)',
              cursor: 'pointer',
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              boxShadow: '0 0 0 3px rgba(193,154,75,0.18)',
            }}
          >
            {suggestion.cta} →
          </button>
          <button
            type="button"
            style={{
              padding: '10px 16px',
              background: 'transparent',
              color: 'var(--pl-muted)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </article>
  );
}

function computeSuggestion(site: EventHQSite): { title: string; description: string; cta: string } {
  const rsvp = site.rsvpStats;
  const days = site.eventDate
    ? Math.ceil((new Date(site.eventDate).getTime() - Date.now()) / 86400000)
    : null;

  if (rsvp && rsvp.total > 0 && rsvp.pending / rsvp.total > 0.4) {
    return {
      title: 'Send a save-the-date nudge.',
      description: `${rsvp.pending} of ${rsvp.total} guests haven't replied. A short, warm nudge usually lifts response rate by 30–40%.`,
      cta: 'Draft nudge',
    };
  }

  if (days != null && days > 0 && days <= 14) {
    return {
      title: 'Lock the run-of-show.',
      description: `You're ${days} days out. Time to confirm vendor arrival times, seating, and the toast schedule with everyone involved.`,
      cta: 'Open day-of',
    };
  }

  if (!site.eventDate) {
    return {
      title: 'Set your event date so Pear can plan.',
      description: 'A date unlocks the countdown, vendor reminders, and the day-of timeline. Takes 10 seconds.',
      cta: 'Set date',
    };
  }

  return {
    title: 'Add three more story sections.',
    description: 'Hosts who add a "How we met", "What to expect", and a "Travel" section see 2× longer guest dwell time.',
    cta: 'Open editor',
  };
}

// ─────────────────────────────────────────────────────────────

function QuickLane({
  index,
  href,
  icon,
  label,
  hint,
  accent,
  divider,
  topBorder,
}: {
  index: number;
  href: string;
  icon: ReactNode;
  label: string;
  hint: string;
  accent: 'olive' | 'gold' | 'plum';
  divider?: boolean;
  topBorder?: boolean;
}) {
  const accentVar =
    accent === 'olive' ? 'var(--pl-olive)' : accent === 'gold' ? 'var(--pl-gold)' : 'var(--pl-plum)';

  return (
    <Link
      href={href}
      style={{
        position: 'relative',
        display: 'block',
        padding: '18px 16px 16px',
        background: 'var(--pl-cream-card)',
        borderLeft: divider ? '1px solid var(--pl-divider)' : 'none',
        borderTop: topBorder ? '1px solid var(--pl-divider)' : 'none',
        textDecoration: 'none',
        color: 'var(--pl-ink)',
        transition:
          'background 240ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background =
          'var(--pl-cream-deep)';
        const arrow = e.currentTarget.querySelector(
          '[data-arrow]',
        ) as HTMLSpanElement | null;
        if (arrow) arrow.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background =
          'var(--pl-cream-card)';
        const arrow = e.currentTarget.querySelector(
          '[data-arrow]',
        ) as HTMLSpanElement | null;
        if (arrow) arrow.style.transform = 'translateX(0)';
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.26em',
            color: 'var(--pl-gold)',
          }}
        >
          № {String(index).padStart(2, '0')}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 'var(--pl-radius-xs)',
            background: 'var(--pl-cream-deep)',
            border: `1px solid ${accentVar}`,
            color: accentVar,
          }}
        >
          {icon}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--pl-font-display)',
          fontStyle: 'italic',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          fontSize: '1.1rem',
          color: 'var(--pl-ink)',
          letterSpacing: '-0.005em',
          lineHeight: 1.1,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: '0.76rem',
          color: 'var(--pl-ink-soft)',
          lineHeight: 1.4,
        }}
      >
        <span>{hint}</span>
        <span
          data-arrow
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.75rem',
            color: accentVar,
            transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          →
        </span>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────

function RunOfShow() {
  const ROWS: { time: string; label: string; lane: string; state: 'done' | 'live' | 'next' | 'queued' }[] = [
    { time: '09:00', label: 'Florals delivered · East entry', lane: 'Vendors', state: 'done' },
    { time: '10:30', label: 'Hair & makeup begins · Suite 4', lane: 'Suite', state: 'done' },
    { time: '13:00', label: 'Ceremony rehearsal · Garden', lane: 'On site', state: 'live' },
    { time: '15:30', label: 'First-look · East lawn', lane: 'On site', state: 'next' },
    { time: '17:00', label: 'Ceremony seating', lane: 'Guests', state: 'queued' },
    { time: '19:30', label: 'Toasts & dinner', lane: 'Reception', state: 'queued' },
  ];

  return (
    <div>
      {/* Column header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 88px 1fr 130px 88px',
          alignItems: 'center',
          gap: 16,
          padding: '12px 22px',
          borderBottom: '1px solid var(--pl-divider)',
          background: 'var(--pl-cream-deep)',
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.46rem',
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--pl-muted)',
        }}
      >
        <span>№</span>
        <span>Time</span>
        <span>Cue</span>
        <span>Lane</span>
        <span style={{ justifySelf: 'end' }}>State</span>
      </div>
      {ROWS.map((r, i) => {
        const isLive = r.state === 'live';
        const isDone = r.state === 'done';
        return (
          <div
            key={r.time}
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '40px 88px 1fr 130px 88px',
              alignItems: 'center',
              gap: 16,
              padding: '16px 22px',
              borderBottom:
                i < ROWS.length - 1 ? '1px solid var(--pl-divider-soft)' : 'none',
              background: isLive ? 'var(--pl-olive-mist)' : 'transparent',
            }}
          >
            {isLive && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 2,
                  background: 'var(--pl-olive)',
                }}
              />
            )}
            <span
              style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.22em',
                color: isDone ? 'var(--pl-muted)' : 'var(--pl-gold)',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.92rem',
                fontWeight: 600,
                color: isDone ? 'var(--pl-muted)' : 'var(--pl-ink)',
                letterSpacing: '0.04em',
              }}
            >
              {r.time}
            </span>
            <span
              style={{
                fontFamily: 'var(--pl-font-display)',
                fontStyle: 'italic',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                color: isDone ? 'var(--pl-muted)' : 'var(--pl-ink)',
                textDecoration: isDone ? 'line-through' : 'none',
                fontSize: '1.02rem',
                letterSpacing: '-0.005em',
                lineHeight: 1.3,
              }}
            >
              {r.label}
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontFamily: 'var(--pl-font-mono)',
                color: 'var(--pl-muted)',
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              {r.lane}
            </span>
            <span
              style={{
                justifySelf: 'end',
                padding: '4px 10px',
                borderRadius: 'var(--pl-radius-xs)',
                fontSize: '0.72rem',
                fontFamily: 'var(--pl-font-mono)',
                fontWeight: 700,
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                background:
                  r.state === 'live'
                    ? 'var(--pl-olive)'
                    : r.state === 'next'
                    ? 'color-mix(in oklab, var(--pl-gold) 18%, transparent)'
                    : r.state === 'done'
                    ? 'var(--pl-cream-deep)'
                    : 'transparent',
                color:
                  r.state === 'live'
                    ? 'var(--pl-cream)'
                    : r.state === 'next'
                    ? 'var(--pl-gold)'
                    : r.state === 'done'
                    ? 'var(--pl-muted)'
                    : 'var(--pl-muted)',
                border:
                  r.state === 'queued' || r.state === 'next'
                    ? '1px solid var(--pl-divider)'
                    : 'none',
              }}
            >
              {r.state}
            </span>
          </div>
        );
      })}

      <div
        style={{
          padding: '14px 22px',
          background: 'var(--pl-cream-deep)',
          borderTop: '1px solid var(--pl-divider)',
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: 'var(--pl-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Edit · Re-order · Voice updates auto-attached</span>
        <Link
          href="/dashboard/day-of"
          style={{
            color: 'var(--pl-olive)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Full call-sheet <ArrowUpRight size={11} />
        </Link>
      </div>
    </div>
  );
}

// Suppress unused imports kept for future expansion
void Mic;
