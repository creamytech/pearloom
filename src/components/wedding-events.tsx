'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/wedding-events.tsx
// Multi-event display: ceremony, reception, rehearsal dinner, etc.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import {
  CeremonyIcon,
  ChampagneIcon,
  BouquetIcon,
  CalendarHeartIcon,
  LocationPinIcon,
  StarburstIcon,
} from '@/components/icons/PearloomIcons';
import { PearSectionDivider } from '@/components/icons/PearShapes';
import type { WeddingEvent } from '@/types';

function getEventIcon(type: WeddingEvent['type'], size = 18) {
  switch (type) {
    case 'ceremony':
      return <CeremonyIcon size={size} color="var(--eg-accent)" />;
    case 'reception':
      return <ChampagneIcon size={size} color="var(--eg-accent)" />;
    case 'rehearsal':
      return <BouquetIcon size={size} color="var(--eg-accent)" />;
    default:
      return <CalendarHeartIcon size={size} color="var(--eg-accent)" />;
  }
}

function EventCard({ event, index }: { event: WeddingEvent; index: number }) {
  const dateObj = (() => {
    try {
      return new Date(event.date);
    } catch {
      return null;
    }
  })();
  const dayNum = dateObj
    ? dateObj.toLocaleDateString('en-US', { day: 'numeric' })
    : '';
  const monthName = dateObj
    ? dateObj.toLocaleDateString('en-US', { month: 'long' })
    : '';
  const yearStr = dateObj
    ? dateObj.toLocaleDateString('en-US', { year: 'numeric' })
    : '';
  const weekday = dateObj
    ? dateObj.toLocaleDateString('en-US', { weekday: 'long' })
    : '';

  const directionsUrl =
    event.mapUrl ||
    (event.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`
      : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.85,
        delay: index * 0.13,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        background: '#ffffff',
        borderRadius: '1.25rem',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(43,43,43,0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          background: 'var(--eg-accent)',
          borderRadius: '1.25rem 0 0 1.25rem',
        }}
      />

      {/* Event type header */}
      <div
        style={{
          padding: '1.5rem 1.75rem 1.25rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--eg-accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {getEventIcon(event.type)}
        </div>
        <div>
          <h3
            style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: '1.4rem',
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--eg-fg)',
              lineHeight: 1.15,
            }}
          >
            {event.name}
          </h3>
        </div>
      </div>

      {/* Large invitation-style date */}
      <div
        style={{
          padding: '1.25rem 2rem 1.5rem',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          textAlign: 'center',
          background: 'rgba(245,241,232,0.4)',
        }}
      >
        <div
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--eg-muted)',
            marginBottom: '0.5rem',
            fontWeight: 600,
          }}
        >
          {weekday}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(3rem, 6vw, 4.25rem)',
              fontWeight: 400,
              color: 'var(--eg-fg)',
              lineHeight: 1,
            }}
          >
            {dayNum}
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--eg-font-heading)',
                fontSize: '1.1rem',
                fontWeight: 400,
                color: 'var(--eg-fg)',
                lineHeight: 1.2,
              }}
            >
              {monthName}
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--eg-muted)',
                letterSpacing: '0.1em',
              }}
            >
              {yearStr}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div
        style={{
          padding: '1.5rem 1.75rem 1.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          flex: 1,
        }}
      >
        {/* Time */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <CalendarHeartIcon
            size={15}
            color="var(--eg-accent)"
            style={{ flexShrink: 0, marginTop: '0.15rem' }}
          />
          <div>
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--eg-fg)',
                marginBottom: '0.1rem',
              }}
            >
              {event.time}
              {event.endTime && (
                <span
                  style={{
                    fontWeight: 400,
                    color: 'var(--eg-muted)',
                    fontSize: '0.82rem',
                    marginLeft: '0.4rem',
                  }}
                >
                  until {event.endTime}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Venue */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <LocationPinIcon
            size={15}
            color="var(--eg-accent)"
            style={{ flexShrink: 0, marginTop: '0.15rem' }}
          />
          <div>
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--eg-fg)',
                marginBottom: '0.1rem',
              }}
            >
              {event.venue}
            </div>
            {event.address && (
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--eg-muted)',
                  lineHeight: 1.5,
                }}
              >
                {event.address}
              </div>
            )}
          </div>
        </div>

        {/* Dress code */}
        {event.dressCode && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <StarburstIcon
              size={15}
              color="var(--eg-accent)"
              style={{ flexShrink: 0, marginTop: '0.15rem' }}
            />
            <div>
              <div
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--eg-muted)',
                  marginBottom: '0.1rem',
                }}
              >
                Dress Code
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--eg-fg)' }}>
                {event.dressCode}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--eg-muted)',
              lineHeight: 1.7,
              marginTop: 'auto',
              paddingTop: '0.85rem',
              borderTop: '1px solid rgba(0,0,0,0.04)',
              fontStyle: 'italic',
            }}
          >
            {event.description}
          </p>
        )}
      </div>

      {/* Directions footer */}
      {directionsUrl && (
        <div
          style={{
            padding: '1rem 1.75rem 1.25rem 2rem',
            borderTop: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            gap: '0.6rem',
            flexWrap: 'wrap' as const,
          }}
        >
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#fff',
              background: 'var(--eg-accent)',
              padding: '0.45rem 1rem',
              borderRadius: '100px',
              textDecoration: 'none',
              letterSpacing: '0.06em',
            }}
          >
            <LocationPinIcon size={11} />
            Get Directions
            <ExternalLink size={10} />
          </a>
          {event.address && (
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent(event.address)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--eg-muted)',
                background: 'rgba(0,0,0,0.04)',
                padding: '0.45rem 1rem',
                borderRadius: '100px',
                textDecoration: 'none',
                letterSpacing: '0.06em',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              Apple Maps
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface WeddingEventsProps {
  events: WeddingEvent[];
  title?: string;
  subtitle?: string;
}

export function WeddingEvents({
  events,
  title = 'Our Celebration',
  subtitle = 'Save the dates and join us for every moment.',
}: WeddingEventsProps) {
  if (!events || events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const isSingle = sorted.length === 1;

  return (
    <section
      style={{
        background: 'var(--eg-bg-section)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Pear wave divider at top */}
      <PearSectionDivider
        color="var(--eg-bg)"
        opacity={1}
      />

      <div style={{ padding: '4rem 2rem 8rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            style={{ textAlign: 'center', marginBottom: '5rem' }}
          >
            {/* Eyebrow with CeremonyIcon */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '1px',
                  background: 'var(--eg-accent)',
                  opacity: 0.3,
                }}
              />
              <CeremonyIcon size={20} color="var(--eg-accent)" style={{ opacity: 0.75 }} />
              <div
                style={{
                  width: '48px',
                  height: '1px',
                  background: 'var(--eg-accent)',
                  opacity: 0.3,
                }}
              />
            </div>

            <h2
              style={{
                fontFamily: 'var(--eg-font-heading)',
                fontSize: 'clamp(2.75rem, 5.5vw, 4.25rem)',
                fontWeight: 400,
                letterSpacing: '-0.025em',
                color: 'var(--eg-fg)',
                marginBottom: '1.5rem',
                lineHeight: 1.05,
              }}
            >
              {title}
            </h2>

            {/* Ornamental rule */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '1px',
                  background: 'var(--eg-accent)',
                  opacity: 0.35,
                }}
              />
              <div
                style={{
                  width: '4px',
                  height: '4px',
                  background: 'var(--eg-accent)',
                  transform: 'rotate(45deg)',
                  opacity: 0.5,
                }}
              />
              <div
                style={{
                  width: '24px',
                  height: '1px',
                  background: 'var(--eg-accent)',
                  opacity: 0.35,
                }}
              />
            </div>

            <p
              style={{
                color: 'var(--eg-muted)',
                fontSize: '1.05rem',
                fontStyle: 'italic',
                lineHeight: 1.65,
              }}
            >
              {subtitle}
            </p>
          </motion.div>

          {/* Cards grid */}
          <div
            style={
              isSingle
                ? {
                    maxWidth: '600px',
                    margin: '0 auto',
                  }
                : {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1.75rem',
                  }
            }
          >
            {/* Single-card wrapper for centering */}
            {isSingle ? (
              <EventCard event={sorted[0]} index={0} />
            ) : (
              sorted.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))
            )}
          </div>

          {/* Responsive: stack on mobile via inline media query workaround */}
          <style>{`
            @media (max-width: 680px) {
              .wedding-events-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </div>
      </div>
    </section>
  );
}
