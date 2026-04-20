'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/guest-dashboard.tsx
// Guest Dashboard — shown after RSVP submission
// Personalized summary with event details, countdown, and useful links
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Music, Utensils, Heart } from 'lucide-react';
import { parseLocalDate } from '@/lib/date';

interface GuestDashboardProps {
  guestName: string;
  status: 'attending' | 'declined';
  coupleNames: [string, string];
  eventDate?: string;
  events?: Array<{
    id: string;
    name: string;
    venue?: string;
    address?: string;
    time?: string;
  }>;
  mealPreference?: string;
  plusOneName?: string;
  songRequest?: string;
  hotels?: Array<{
    name: string;
    address?: string;
    bookingUrl?: string;
  }>;
  onEditRsvp?: () => void;
}

// ── Countdown logic ────────────────────────────────────────────

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: string): TimeLeft | null {
  const now = new Date().getTime();
  const then = parseLocalDate(target).getTime();
  const diff = then - now;
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function getFirstName(fullName: string): string {
  return fullName.split(/\s+/)[0];
}

function buildMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// ── Animation variants ─────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ── Shared card style ──────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '1.25rem',
  border: '1px solid rgba(0,0,0,0.06)',
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(43,43,43,0.04)',
};

const cardHeaderBar: React.CSSProperties = {
  height: '3px',
  background:
    'linear-gradient(90deg, var(--pl-olive) 0%, color-mix(in srgb, var(--pl-olive) 30%, transparent) 100%)',
};

const sectionLabel: React.CSSProperties = {
  fontSize: '0.6rem',
  letterSpacing: '0.32em',
  textTransform: 'uppercase' as const,
  color: 'var(--pl-muted)',
  fontWeight: 700,
  marginBottom: '0.5rem',
};

// ── Component ──────────────────────────────────────────────────

export function GuestDashboard({
  guestName,
  status,
  coupleNames,
  eventDate,
  events = [],
  mealPreference,
  plusOneName,
  songRequest,
  hotels = [],
  onEditRsvp,
}: GuestDashboardProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!eventDate) return;

    const update = () => setTimeLeft(getTimeLeft(eventDate));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [eventDate]);

  const firstName = getFirstName(guestName);

  // Declined guests get a simpler view
  if (status === 'declined') {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          maxWidth: '560px',
          margin: '0 auto',
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <div style={cardStyle} className="pl-scroll-fade-up">
          <div style={cardHeaderBar} />
          <div style={{ padding: '3rem 2rem' }}>
            <Heart
              size={32}
              style={{ color: 'var(--pl-olive)', margin: '0 auto 1.25rem' }}
            />
            <h2
              style={{
                fontFamily: 'var(--pl-font-heading)',
                fontSize: '1.75rem',
                color: 'var(--pl-ink)',
                marginBottom: '1rem',
              }}
            >
              We&rsquo;ll miss you, {firstName}
            </h2>
            <p
              style={{
                fontFamily: 'var(--pl-font-body)',
                color: 'var(--pl-muted)',
                lineHeight: 1.7,
                marginBottom: '2rem',
              }}
            >
              We understand you won&rsquo;t be able to make it. We&rsquo;ll be
              thinking of you on our special day. If your plans change, you can
              always update your response.
            </p>
            {onEditRsvp && (
              <button
                onClick={onEditRsvp}
                style={{
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  padding: '0.75rem 2rem',
                  borderRadius: '2rem',
                  border: '1px solid var(--pl-olive)',
                  background: 'transparent',
                  color: 'var(--pl-olive)',
                  cursor: 'pointer',
                  transition: 'background 0.25s, color 0.25s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget.style.background as string) = 'var(--pl-olive)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--pl-olive)';
                }}
              >
                Change My RSVP
              </button>
            )}
          </div>
        </div>
      </motion.section>
    );
  }

  // ── Attending view ──────────────────────────────────────────

  const countdownSegments = timeLeft
    ? [
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hours' },
        { value: timeLeft.minutes, label: 'Min' },
        { value: timeLeft.seconds, label: 'Sec' },
      ]
    : [];

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: '3rem 1.5rem 4rem',
      }}
    >
      {/* ── Welcome header ─────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        style={{ textAlign: 'center', marginBottom: '2.5rem' }}
      >
        <p style={sectionLabel}>
          {coupleNames[0]} &amp; {coupleNames[1]}
        </p>
        <h1
          style={{
            fontFamily: 'var(--pl-font-heading)',
            fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
            color: 'var(--pl-ink)',
            fontWeight: 400,
            marginBottom: '0.5rem',
          }}
        >
          See you there, {firstName}!
        </h1>
        {eventDate && (
          <p
            style={{
              fontFamily: 'var(--pl-font-body)',
              color: 'var(--pl-muted)',
              fontSize: '1rem',
            }}
          >
            {parseLocalDate(eventDate).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </motion.div>

      {/* ── Countdown timer ────────────────────────────────── */}
      {mounted && eventDate && timeLeft && (
        <motion.div
          variants={fadeUp}
          className="pl-scroll-fade-up"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '3rem',
            flexWrap: 'wrap',
          }}
        >
          {countdownSegments.map((seg) => (
            <div
              key={seg.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.07)',
                borderRadius: '1rem',
                padding: '0.9rem 1.3rem',
                minWidth: '64px',
                boxShadow: '0 2px 12px rgba(43,43,43,0.05)',
              }}
            >
              <motion.span
                key={seg.value}
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 600,
                  color: 'var(--pl-ink)',
                  lineHeight: 1,
                  fontFamily: 'var(--pl-font-heading)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {String(seg.value).padStart(2, '0')}
              </motion.span>
              <span
                style={{
                  fontSize: '0.5rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-muted)',
                  marginTop: '0.35rem',
                  fontWeight: 700,
                }}
              >
                {seg.label}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Cards grid ─────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* ── RSVP summary card ────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="pl-scroll-fade-up"
          style={cardStyle}
        >
          <div style={cardHeaderBar} />
          <div style={{ padding: '2rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <Heart size={16} style={{ color: 'var(--pl-olive)' }} />
              <span style={sectionLabel}>Your RSVP</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.25rem',
              }}
            >
              {/* Status */}
              <SummaryField
                icon={<Users size={14} />}
                label="Status"
                value="Attending"
              />

              {/* Meal */}
              {mealPreference && (
                <SummaryField
                  icon={<Utensils size={14} />}
                  label="Meal"
                  value={mealPreference}
                />
              )}

              {/* Plus one */}
              {plusOneName && (
                <SummaryField
                  icon={<Users size={14} />}
                  label="Plus One"
                  value={plusOneName}
                />
              )}

              {/* Song request */}
              {songRequest && (
                <SummaryField
                  icon={<Music size={14} />}
                  label="Song Request"
                  value={songRequest}
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Event schedule cards ─────────────────────────── */}
        {events.map((event, i) => (
          <motion.div
            key={event.id}
            variants={fadeUp}
            className="pl-scroll-fade-up"
            style={cardStyle}
          >
            <div style={cardHeaderBar} />
            <div style={{ padding: '2rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <Calendar size={16} style={{ color: 'var(--pl-olive)' }} />
                <span style={sectionLabel}>Event</span>
              </div>

              <h3
                style={{
                  fontFamily: 'var(--pl-font-heading)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--pl-ink)',
                  marginBottom: '1rem',
                }}
              >
                {event.name}
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                {event.time && (
                  <div style={infoRow}>
                    <Clock size={14} style={{ color: 'var(--pl-muted)', flexShrink: 0 }} />
                    <span style={infoText}>{event.time}</span>
                  </div>
                )}

                {event.venue && (
                  <div style={infoRow}>
                    <MapPin size={14} style={{ color: 'var(--pl-muted)', flexShrink: 0 }} />
                    <span style={infoText}>{event.venue}</span>
                  </div>
                )}

                {event.address && (
                  <a
                    href={buildMapsUrl(event.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--pl-olive)',
                      textDecoration: 'none',
                      marginTop: '0.35rem',
                      transition: 'opacity var(--pl-dur-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <MapPin size={12} />
                    Get Directions
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* ── Hotel info cards ─────────────────────────────── */}
        {hotels.map((hotel, i) => (
          <motion.div
            key={hotel.name}
            variants={fadeUp}
            className="pl-scroll-fade-up"
            style={cardStyle}
          >
            <div style={cardHeaderBar} />
            <div style={{ padding: '2rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <MapPin size={16} style={{ color: 'var(--pl-olive)' }} />
                <span style={sectionLabel}>Accommodation</span>
              </div>

              <h3
                style={{
                  fontFamily: 'var(--pl-font-heading)',
                  fontSize: '1.15rem',
                  fontWeight: 600,
                  color: 'var(--pl-ink)',
                  marginBottom: '0.75rem',
                }}
              >
                {hotel.name}
              </h3>

              {hotel.address && (
                <div style={{ ...infoRow, marginBottom: '0.5rem' }}>
                  <MapPin size={14} style={{ color: 'var(--pl-muted)', flexShrink: 0 }} />
                  <span style={infoText}>{hotel.address}</span>
                </div>
              )}

              {hotel.bookingUrl && (
                <a
                  href={hotel.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    fontFamily: 'var(--pl-font-body)',
                    color: '#fff',
                    background: 'var(--pl-olive)',
                    padding: '0.55rem 1.4rem',
                    borderRadius: '2rem',
                    textDecoration: 'none',
                    marginTop: '0.75rem',
                    transition: 'opacity var(--pl-dur-base)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  Book Now
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Edit RSVP button ───────────────────────────────── */}
      {onEditRsvp && (
        <motion.div
          variants={fadeUp}
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '3rem',
          }}
        >
          <button
            onClick={onEditRsvp}
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.85rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              padding: '0.75rem 2.25rem',
              borderRadius: '2rem',
              border: '1px solid var(--pl-olive)',
              background: 'transparent',
              color: 'var(--pl-olive)',
              cursor: 'pointer',
              transition: 'background 0.25s, color 0.25s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--pl-olive)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--pl-olive)';
            }}
          >
            Edit My RSVP
          </button>
        </motion.div>
      )}
    </motion.section>
  );
}

// ── Sub-components ─────────────────────────────────────────────

const infoRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const infoText: React.CSSProperties = {
  fontFamily: 'var(--pl-font-body)',
  fontSize: '0.88rem',
  color: 'var(--pl-muted)',
  lineHeight: 1.5,
};

function SummaryField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          color: 'var(--pl-muted)',
          marginBottom: '0.3rem',
        }}
      >
        {icon}
        <span
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontFamily: 'var(--pl-font-body)',
          fontSize: '0.95rem',
          color: 'var(--pl-ink)',
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}
