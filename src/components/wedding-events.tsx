'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/wedding-events.tsx
// Multi-event display: ceremony, reception, rehearsal dinner, etc.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Clock, ExternalLink, Shirt } from 'lucide-react';
import { CalendarHeartIcon, LocationPinIcon } from '@/components/icons/PearloomIcons';
import type { WeddingEvent } from '@/types';

const EVENT_ICONS: Record<string, string> = {
  ceremony: '💒',
  reception: '🥂',
  rehearsal: '🎭',
  brunch: '☕',
  engagement: '💍',
  shower: '🌸',
  default: '🎊',
};

function getEventIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(EVENT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return EVENT_ICONS.default;
}

function EventCard({ event, index }: { event: WeddingEvent; index: number }) {
  const dateObj = (() => { try { return new Date(event.date); } catch { return null; } })();
  const dayNum = dateObj ? dateObj.toLocaleDateString('en-US', { day: 'numeric' }) : '';
  const monthName = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'long' }) : '';
  const yearStr = dateObj ? dateObj.toLocaleDateString('en-US', { year: 'numeric' }) : '';
  const weekday = dateObj ? dateObj.toLocaleDateString('en-US', { weekday: 'long' }) : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.85, delay: index * 0.13, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}
      style={{
        background: 'var(--eg-card-bg, #fff)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.4s ease, transform 0.4s ease',
        /* subtle dot grid texture */
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.025) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
        backgroundBlendMode: 'multiply',
      }}
    >
      {/* Invitation header — top accent bar with event label */}
      <div style={{
        height: '3px',
        background: 'linear-gradient(90deg, var(--eg-accent) 0%, color-mix(in srgb, var(--eg-accent) 40%, transparent) 100%)',
      }} />

      {/* Event name label */}
      <div style={{
        padding: '1.5rem 2rem 0',
        display: 'flex', alignItems: 'center', gap: '0.85rem',
      }}>
        <span style={{ fontSize: '1.2rem' }}>{getEventIcon(event.name)}</span>
        <span style={{
          fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.28em',
          textTransform: 'uppercase', color: 'var(--eg-accent)',
        }}>
          {event.name}
        </span>
      </div>

      {/* Large date display — invitation style */}
      <div style={{
        padding: '1.25rem 2rem 1.5rem',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>{weekday}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(3rem, 6vw, 4.5rem)', fontWeight: 400, color: 'var(--eg-fg)', lineHeight: 1 }}>{dayNum}</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.1rem', fontWeight: 400, color: 'var(--eg-fg)', lineHeight: 1.2 }}>{monthName}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--eg-muted)', letterSpacing: '0.1em' }}>{yearStr}</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, background: 'rgba(255,255,255,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <Clock size={14} color="var(--eg-accent)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.1rem', letterSpacing: '0.01em' }}>{event.time}</div>
            {event.endTime && <div style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', fontStyle: 'italic' }}>until {event.endTime}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <LocationPinIcon size={14} color="var(--eg-accent)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.1rem' }}>{event.venue}</div>
            {event.address && <div style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', lineHeight: 1.5 }}>{event.address}</div>}
          </div>
        </div>

        {event.dressCode && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <Shirt size={14} color="var(--eg-accent)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.1rem' }}>Dress Code</div>
              <div style={{ fontSize: '0.88rem', color: 'var(--eg-fg)' }}>{event.dressCode}</div>
            </div>
          </div>
        )}

        {event.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--eg-muted)', lineHeight: 1.7, marginTop: 'auto', paddingTop: '0.85rem', borderTop: '1px solid rgba(0,0,0,0.04)', fontStyle: 'italic' }}>
            {event.description}
          </p>
        )}
      </div>

      {/* Embedded map + directions */}
      {event.address && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {/* Google Maps embed */}
          <iframe
            title={`Map — ${event.venue}`}
            width="100%"
            height="180"
            frameBorder="0"
            style={{ display: 'block' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(event.address)}&output=embed&z=15`}
          />
          <div style={{ padding: '0.85rem 1.5rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <a
              href={event.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.72rem', fontWeight: 700, color: '#fff',
                background: 'var(--eg-accent)',
                padding: '0.45rem 1rem', borderRadius: '100px',
                textDecoration: 'none', letterSpacing: '0.06em',
              }}
            >
              <LocationPinIcon size={11} /> Directions <ExternalLink size={10} />
            </a>
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent(event.address)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.72rem', fontWeight: 700, color: 'var(--eg-muted)',
                background: 'rgba(0,0,0,0.04)', padding: '0.45rem 1rem', borderRadius: '100px',
                textDecoration: 'none', letterSpacing: '0.06em',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              Apple Maps <ExternalLink size={10} />
            </a>
          </div>
        </div>
      )}

      {/* Fallback map link if only mapUrl, no address */}
      {!event.address && event.mapUrl && (
        <div style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <a
            href={event.mapUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.8rem', fontWeight: 700, color: 'var(--eg-accent)',
              textDecoration: 'none', letterSpacing: '0.05em',
            }}
          >
            <LocationPinIcon size={14} /> Get Directions <ExternalLink size={11} />
          </a>
        </div>
      )}
    </motion.div>
  );
}

interface WeddingEventsProps {
  events: WeddingEvent[];
  title?: string;
}

export function WeddingEvents({ events, title = 'Our Celebration' }: WeddingEventsProps) {
  if (!events || events.length === 0) return null;

  // Sort by date ascending
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <section style={{ padding: '8rem 2rem', background: 'var(--eg-card-bg)', position: 'relative' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          style={{ textAlign: 'center', marginBottom: '5rem' }}
        >
          {/* Eyebrow with flanking ornament */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <div style={{ width: '50px', height: '1px', background: 'var(--eg-accent)', opacity: 0.25 }} />
            <CalendarHeartIcon size={16} color="var(--eg-accent)" style={{ opacity: 0.7 }} />
            <div style={{ width: '50px', height: '1px', background: 'var(--eg-accent)', opacity: 0.25 }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.75rem, 5.5vw, 4.25rem)',
            fontWeight: 400, letterSpacing: '-0.025em',
            color: 'var(--eg-fg)', marginBottom: '1.25rem',
            lineHeight: 1.05,
          }}>
            {title}
          </h2>
          {/* Ornamental rule */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '24px', height: '1px', background: 'var(--eg-accent)', opacity: 0.35 }} />
            <div style={{ width: '4px', height: '4px', background: 'var(--eg-accent)', transform: 'rotate(45deg)', opacity: 0.5 }} />
            <div style={{ width: '24px', height: '1px', background: 'var(--eg-accent)', opacity: 0.35 }} />
          </div>
          <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', fontStyle: 'italic', lineHeight: 1.65 }}>
            Save the dates and join us for every moment.
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(320px, 1fr))`,
          gap: '1.5rem',
        }}>
          {sorted.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
