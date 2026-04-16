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
import { StatTile, PageCard, Button } from '@/components/shell';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1180, margin: '0 auto' }}>
      {/* ── Editorial header ───────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
          paddingBottom: 24,
          borderBottom: '1px solid var(--pl-divider)',
        }}
      >
        <div>
          <div
            className="pl-overline"
            style={{ marginBottom: 14 }}
          >
            Event HQ · {site.occasion || 'Event'}
          </div>
          <h1
            className="pl-display"
            style={{
              margin: 0,
              fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)',
              color: 'var(--pl-ink)',
              lineHeight: 1.05,
            }}
          >
            {titleNames}
          </h1>
          {site.eventDate && (
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.78rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--pl-muted)',
              }}
            >
              {formatEventDate(site.eventDate)}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {onShare && (
            <Button variant="outline" size="sm" onClick={onShare} leftIcon={<ArrowUpRight size={14} />}>
              Share site
            </Button>
          )}
          {onEdit && (
            <Button variant="primary" size="sm" onClick={onEdit} leftIcon={<Edit3 size={14} />}>
              Edit site
            </Button>
          )}
        </div>
      </header>

      {/* ── Stat row ───────────────────────────────────────────── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <StatTile
          accent="olive"
          icon={<Calendar size={14} />}
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
          icon={<Users size={14} />}
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
          icon={<Briefcase size={14} />}
          label="Vendors"
          value={site.vendorCount ?? 0}
          hint="bookings tracked"
        />
        <StatTile
          accent="none"
          icon={<ImageIcon size={14} />}
          label="Gallery"
          value={site.galleryCount ?? 0}
          hint="moments captured"
        />
      </section>

      {/* ── Pear suggests + Quick lanes ───────────────────────── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 24,
        }}
        className="pl-eventhq-grid"
      >
        <PearSuggestCard site={site} />
        <PageCard
          title="Quick lanes"
          eyebrow="Jump straight in"
          padding="md"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QuickLane
              href="/dashboard/day-of"
              icon={<Megaphone size={16} />}
              label="Day-of"
              hint="Run of show + announcements"
              accent="olive"
            />
            <QuickLane
              href="/dashboard/rsvp"
              icon={<Users size={16} />}
              label="Guest list"
              hint="Seats, dietary, plus-ones"
              accent="gold"
            />
            <QuickLane
              href="/dashboard/gallery"
              icon={<Camera size={16} />}
              label="Gallery"
              hint="Curate the album"
              accent="plum"
            />
            <QuickLane
              href="/dashboard/director"
              icon={<Sparkles size={16} />}
              label="Director"
              hint="Talk to Pear"
              accent="olive"
            />
          </div>
        </PageCard>
      </section>

      {/* ── Run of show ────────────────────────────────────────── */}
      <PageCard
        title="Run of show"
        eyebrow="Today · Live"
        padding="none"
        accent="olive"
      >
        <RunOfShow />
      </PageCard>

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
    <PageCard padding="lg" accent="gold">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          className="pl-overline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Sparkles size={12} style={{ color: 'var(--pl-gold)' }} />
          Pear suggests
        </div>

        <h3
          className="pl-display-italic"
          style={{
            margin: 0,
            fontSize: 'clamp(1.3rem, 2.2vw, 1.7rem)',
            color: 'var(--pl-ink)',
            lineHeight: 1.2,
          }}
        >
          {suggestion.title}
        </h3>

        <p
          style={{
            margin: 0,
            color: 'var(--pl-ink-soft)',
            fontSize: '0.95rem',
            lineHeight: 1.55,
          }}
        >
          {suggestion.description}
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <Button size="sm" variant="primary">
            {suggestion.cta}
          </Button>
          <Button size="sm" variant="ghost">
            Dismiss
          </Button>
        </div>
      </div>
    </PageCard>
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
  href,
  icon,
  label,
  hint,
  accent,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  hint: string;
  accent: 'olive' | 'gold' | 'plum';
}) {
  const accentVar =
    accent === 'olive' ? 'var(--pl-olive)' : accent === 'gold' ? 'var(--pl-gold)' : 'var(--pl-plum)';

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '14px 14px 12px',
        background: 'var(--pl-cream)',
        border: '1px solid var(--pl-divider)',
        borderRadius: 'var(--pl-radius-lg)',
        textDecoration: 'none',
        color: 'var(--pl-ink)',
        transition: 'transform var(--pl-dur-fast) var(--pl-ease-spring), border-color var(--pl-dur-fast) var(--pl-ease-out), box-shadow var(--pl-dur-fast) var(--pl-ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = accentVar;
        e.currentTarget.style.boxShadow = 'var(--pl-shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--pl-divider)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--pl-cream-card)',
          border: `1px solid ${accentVar}`,
          color: accentVar,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--pl-ink)' }}>{label}</span>
      <span style={{ fontSize: '0.76rem', color: 'var(--pl-muted)', lineHeight: 1.4 }}>{hint}</span>
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
      {ROWS.map((r, i) => (
        <div
          key={r.time}
          style={{
            display: 'grid',
            gridTemplateColumns: '88px 1fr 130px 90px',
            alignItems: 'center',
            gap: 16,
            padding: '14px 22px',
            borderBottom: i < ROWS.length - 1 ? '1px solid var(--pl-divider-soft)' : 'none',
            background: r.state === 'live' ? 'var(--pl-olive-mist)' : 'transparent',
          }}
          className="pl-ros-row"
        >
          <span
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.82rem',
              color: r.state === 'done' ? 'var(--pl-muted)' : 'var(--pl-ink-soft)',
              letterSpacing: '0.06em',
            }}
          >
            {r.time}
          </span>
          <span
            style={{
              color: r.state === 'done' ? 'var(--pl-muted)' : 'var(--pl-ink)',
              textDecoration: r.state === 'done' ? 'line-through' : 'none',
              fontWeight: r.state === 'live' ? 600 : 400,
              fontSize: '0.94rem',
            }}
          >
            {r.label}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontFamily: 'var(--pl-font-mono)',
              color: 'var(--pl-muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {r.lane}
          </span>
          <span
            style={{
              justifySelf: 'end',
              padding: '3px 10px',
              borderRadius: 'var(--pl-radius-full)',
              fontSize: '0.66rem',
              fontFamily: 'var(--pl-font-mono)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              background:
                r.state === 'live'
                  ? 'var(--pl-olive)'
                  : r.state === 'next'
                  ? 'color-mix(in oklab, var(--pl-gold) 22%, transparent)'
                  : r.state === 'done'
                  ? 'var(--pl-divider)'
                  : 'transparent',
              color:
                r.state === 'live'
                  ? 'var(--pl-cream)'
                  : r.state === 'next'
                  ? 'var(--pl-gold)'
                  : r.state === 'done'
                  ? 'var(--pl-muted)'
                  : 'var(--pl-muted)',
              border: r.state === 'queued' ? '1px solid var(--pl-divider)' : 'none',
            }}
          >
            {r.state}
          </span>
        </div>
      ))}

      <div
        style={{
          padding: '14px 22px',
          background: 'var(--pl-cream-deep)',
          borderTop: '1px solid var(--pl-divider)',
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.66rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--pl-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>· Edit · Re-order · Voice updates auto-attached</span>
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
          Open full <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// Suppress unused imports kept for future expansion
void Mic;
