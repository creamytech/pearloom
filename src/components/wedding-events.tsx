'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/wedding-events.tsx
// Multi-event display: ceremony, reception, rehearsal dinner, etc.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, ExternalLink, Shirt } from 'lucide-react';
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
  const formattedDate = (() => {
    try {
      return new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch { return event.date; }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: '#fff',
        borderRadius: '1.25rem',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '1.75rem 2rem 1.5rem',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        background: 'rgba(0,0,0,0.01)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{getEventIcon(event.name)}</span>
          <span style={{
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--eg-accent)',
          }}>
            {event.name}
          </span>
        </div>
        <h3 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: '1.6rem', fontWeight: 400,
          color: 'var(--eg-fg)', lineHeight: 1.2,
        }}>
          {formattedDate}
        </h3>
      </div>

      {/* Details */}
      <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
          <Clock size={16} color="var(--eg-accent)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.15rem' }}>{event.time}</div>
            {event.endTime && <div style={{ fontSize: '0.8rem', color: 'var(--eg-muted)' }}>until {event.endTime}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
          <MapPin size={16} color="var(--eg-accent)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.15rem' }}>{event.venue}</div>
            {event.address && <div style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', lineHeight: 1.4 }}>{event.address}</div>}
          </div>
        </div>

        {event.dressCode && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
            <Shirt size={16} color="var(--eg-accent)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.15rem' }}>Dress Code</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--eg-fg)' }}>{event.dressCode}</div>
            </div>
          </div>
        )}

        {event.description && (
          <p style={{ fontSize: '0.9rem', color: 'var(--eg-muted)', lineHeight: 1.65, marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            {event.description}
          </p>
        )}
      </div>

      {/* Map link */}
      {event.mapUrl && (
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
            <MapPin size={14} />
            Get Directions
            <ExternalLink size={11} />
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
          style={{ textAlign: 'center', marginBottom: '4.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'var(--eg-fg)', opacity: 0.1 }} />
            <Calendar size={20} color="var(--eg-accent)" strokeWidth={1.5} />
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'var(--eg-fg)', opacity: 0.1 }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 400, letterSpacing: '-0.025em',
            color: 'var(--eg-fg)', marginBottom: '1rem',
          }}>
            {title}
          </h2>
          <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', fontStyle: 'italic' }}>
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
