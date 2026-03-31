'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/wedding-events.tsx
// Multi-event display: ceremony, reception, rehearsal dinner, etc.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Heart, Sparkles, UtensilsCrossed, Wine, Coffee, Calendar } from 'lucide-react';
import {
  CalendarHeartIcon,
  LocationPinIcon,
  StarburstIcon,
} from '@/components/icons/PearloomIcons';
import { WaveDivider } from '@/components/vibe/WaveDivider';
import type { WeddingEvent } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';

function getEventIcon(type: WeddingEvent['type'], accentColor = 'var(--eg-accent)', size = 18) {
  const style = { color: accentColor, width: size, height: size };
  switch (type) {
    case 'ceremony':
      return <Heart style={style} />;
    case 'reception':
      return <Sparkles style={style} />;
    case 'rehearsal':
      return <UtensilsCrossed style={style} />;
    case 'welcome-party':
      return <Wine style={style} />;
    case 'brunch':
      return <Coffee style={style} />;
    default:
      return <Calendar style={style} />;
  }
}

function EventCard({ event, index, vibeSkin }: { event: WeddingEvent; index: number; vibeSkin?: VibeSkin }) {
  const accentColor = vibeSkin?.palette.accent ?? 'var(--eg-accent)';
  const cardBg = vibeSkin?.palette.card ?? 'rgba(255,255,255,0.7)';
  const headingFont = vibeSkin?.fonts.heading ?? 'var(--eg-font-heading)';
  const bodyFont = vibeSkin?.fonts.body ?? 'var(--eg-font-body)';
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
        background: cardBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${accentColor}26`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: bodyFont,
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
          background: accentColor,
          borderRadius: '16px 0 0 16px',
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
            background: `${accentColor}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {getEventIcon(event.type, accentColor)}
        </div>
        <div>
          <h3
            style={{
              fontFamily: headingFont,
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
          background: `${accentColor}0a`,
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

        {/* Ceremony details — only shown when at least one field is populated */}
        {event.ceremony && (event.ceremony.officiant || event.ceremony.processionalSong || event.ceremony.recessionalSong || event.ceremony.vowsType || event.ceremony.unityRitual || event.ceremony.flowerGirl || event.ceremony.ringBearer) && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(163,177,138,0.15)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.5rem' }}>
              Ceremony Details
            </p>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem', fontSize: '0.82rem' }}>
              {event.ceremony.officiant && <><dt style={{ opacity: 0.6 }}>Officiant</dt><dd>{event.ceremony.officiant}</dd></>}
              {event.ceremony.processionalSong && <><dt style={{ opacity: 0.6 }}>Processional</dt><dd style={{ fontStyle: 'italic' }}>{event.ceremony.processionalSong}</dd></>}
              {event.ceremony.recessionalSong && <><dt style={{ opacity: 0.6 }}>Recessional</dt><dd style={{ fontStyle: 'italic' }}>{event.ceremony.recessionalSong}</dd></>}
              {event.ceremony.vowsType && <><dt style={{ opacity: 0.6 }}>Vows</dt><dd style={{ textTransform: 'capitalize' }}>{event.ceremony.vowsType}</dd></>}
              {event.ceremony.unityRitual && <><dt style={{ opacity: 0.6 }}>Unity Ritual</dt><dd>{event.ceremony.unityRitual}</dd></>}
              {event.ceremony.flowerGirl && <><dt style={{ opacity: 0.6 }}>Flower Girl</dt><dd>{event.ceremony.flowerGirl}</dd></>}
              {event.ceremony.ringBearer && <><dt style={{ opacity: 0.6 }}>Ring Bearer</dt><dd>{event.ceremony.ringBearer}</dd></>}
            </dl>
          </div>
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
              background: accentColor,
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
  vibeSkin?: VibeSkin;
}

export function WeddingEvents({
  events,
  title = 'Our Celebration',
  subtitle = 'Save the dates and join us for every moment.',
  vibeSkin,
}: WeddingEventsProps) {
  if (!events || events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const isSingle = sorted.length === 1;

  const accentColor = vibeSkin?.palette.accent ?? 'var(--eg-accent)';
  const headingFont = vibeSkin?.fonts.heading ?? 'var(--eg-font-heading)';
  const eyebrowLabel = vibeSkin?.sectionLabels.events ?? 'The Celebration';
  const accentSymbol = vibeSkin?.accentSymbol ?? '✦';

  // Subtle gradient background instead of flat section color
  const sectionBg = vibeSkin?.palette.subtle
    ? `linear-gradient(180deg, ${vibeSkin.palette.subtle} 0%, ${vibeSkin.palette.background} 100%)`
    : 'var(--eg-bg-section)';

  return (
    <section
      data-pe-section="events" data-pe-label="Events"
      style={{
        background: sectionBg,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Single, subtle wave divider at top — transitions from story section */}
      <WaveDivider
        fromColor={vibeSkin?.palette.background ?? 'var(--eg-bg)'}
        toColor={vibeSkin?.palette.subtle ?? 'var(--eg-bg-section)'}
        skin={vibeSkin}
        height={60}
        opacity={0.65}
      />

      <div style={{ padding: '3rem 2rem 8rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            {/* Eyebrow label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ width: '48px', height: '1px', background: accentColor, opacity: 0.3 }} />
              <span
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.32em',
                  textTransform: 'uppercase',
                  fontVariant: 'small-caps',
                  color: accentColor,
                  fontWeight: 700,
                  opacity: 0.85,
                }}
              >
                {eyebrowLabel}
              </span>
              <div style={{ width: '48px', height: '1px', background: accentColor, opacity: 0.3 }} />
            </div>

            <h2
              style={{
                fontFamily: headingFont,
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

            {/* Accent symbol ornamental divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ width: '24px', height: '1px', background: accentColor, opacity: 0.35 }} />
              <span style={{ color: accentColor, opacity: 0.55, fontSize: '0.9rem' }}>{accentSymbol}</span>
              <div style={{ width: '24px', height: '1px', background: accentColor, opacity: 0.35 }} />
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

          {/* Cards grid — responsive auto-fill */}
          <div
            className="wedding-events-grid"
            style={
              isSingle
                ? {
                    maxWidth: '600px',
                    margin: '0 auto',
                  }
                : {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '20px',
                  }
            }
          >
            {isSingle ? (
              <EventCard event={sorted[0]} index={0} vibeSkin={vibeSkin} />
            ) : (
              sorted.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} vibeSkin={vibeSkin} />
              ))
            )}
          </div>

          {/* Responsive: stack on mobile */}
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
