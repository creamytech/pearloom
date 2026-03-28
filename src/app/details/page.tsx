'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/details/page.tsx — Premium Event Details
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Shirt, Plane, Hotel, Car, Info, Sparkles } from 'lucide-react';
import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';
import { ThemeProvider } from '@/components/theme-provider';
import type { SitePage, ThemeSchema, WeddingEvent, TravelInfo } from '@/types';

const NAMES: [string, string] = ['Ben', 'Shauna'];

const PAGES: SitePage[] = [
  { id: 'pg-1', slug: 'our-story', label: 'Our Story', enabled: true, order: 0 },
  { id: 'pg-2', slug: 'details', label: 'Details', enabled: true, order: 1 },
  { id: 'pg-3', slug: 'rsvp', label: 'RSVP', enabled: true, order: 2 },
  { id: 'pg-4', slug: 'photos', label: 'Photos', enabled: true, order: 3 },
  { id: 'pg-5', slug: 'faq', label: 'FAQ', enabled: true, order: 4 },
];

const THEME: ThemeSchema = {
  name: 'pearloom-ivory',
  fonts: { heading: 'Playfair Display', body: 'Inter' },
  colors: { background: '#faf9f6', foreground: '#1a1a1a', accent: '#b8926a', accentLight: '#f3e8d8', muted: '#8c8c8c', cardBg: '#ffffff' },
  borderRadius: '1rem',
};

const EVENTS: WeddingEvent[] = [
  {
    id: 'evt-1',
    name: 'Anniversary Dinner',
    type: 'other' as const,
    date: '2026-03-15',
    time: '7:00 PM',
    endTime: '10:00 PM',
    venue: 'Our Favorite Restaurant',
    address: '123 Love Lane, Fort Lauderdale, FL',
    description: 'An intimate celebration of two years together. Cocktails at the bar followed by a seated dinner overlooking the water.',
    dressCode: 'Cocktail Attire',
  },
];

const TRAVEL: TravelInfo = {
  airports: ['Fort Lauderdale–Hollywood International Airport (FLL)', 'Miami International Airport (MIA)'],
  hotels: [
    {
      name: 'The Ritz-Carlton, Fort Lauderdale',
      address: '1 N Fort Lauderdale Beach Blvd, Fort Lauderdale, FL',
      groupRate: '$249/night',
      notes: 'Mention "Pearloom" for the group rate. Book by February 15.',
    },
    {
      name: 'W Fort Lauderdale',
      address: '401 N Fort Lauderdale Beach Blvd, Fort Lauderdale, FL',
      groupRate: '$199/night',
      notes: 'Use code PEARLOOM2026 when booking online.',
    },
  ],
  parkingInfo: 'Complimentary valet parking available at the venue. Self-parking garage next door is $10.',
  directions: 'From I-95, take exit 29 toward Sunrise Blvd East. The venue is on the right after 2 miles.',
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '1rem',
  border: '1px solid rgba(0,0,0,0.06)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
  padding: '1.5rem',
  transition: 'box-shadow 0.4s ease, transform 0.4s ease',
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--eg-font-heading)',
  fontSize: '1.25rem',
  fontWeight: 600,
  marginBottom: '1.25rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const detailRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  fontSize: '0.9rem',
  color: '#8c8c8c',
};

export default function DetailsPage() {
  return (
    <ThemeProvider theme={THEME}>
      <SiteNav names={NAMES} pages={PAGES} />

      <main style={{
        minHeight: '100dvh',
        paddingTop: '8rem',
        paddingBottom: '5rem',
        background: 'linear-gradient(180deg, #f5ead6 0%, #faf9f6 35%, #faf9f6 100%)',
      }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 1.5rem' }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: 'center', marginBottom: '3.5rem' }}
          >
            <div style={{
              width: '4.5rem', height: '4.5rem', borderRadius: '50%',
              background: '#f3e8d8', border: '2px solid rgba(184,146,106,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <Sparkles size={22} color="#b8926a" />
            </div>
            <h1 style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              marginBottom: '0.75rem',
            }}>
              The Details
            </h1>
            <p style={{ color: '#8c8c8c', lineHeight: 1.7 }}>
              Everything you need to know for the celebration.
            </p>
          </motion.div>

          {/* Schedule */}
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={sectionTitleStyle}>
              <Calendar size={18} color="#b8926a" /> Schedule
            </h2>
            {EVENTS.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                style={cardStyle}
              >
                <h3 style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem',
                }}>
                  {event.name}
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}>
                  <div style={detailRowStyle}>
                    <Calendar size={15} color="#b8926a" />
                    <span>
                      {new Date(event.date).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div style={detailRowStyle}>
                    <Clock size={15} color="#b8926a" />
                    <span>{event.time}{event.endTime ? ` – ${event.endTime}` : ''}</span>
                  </div>
                  <div style={detailRowStyle}>
                    <MapPin size={15} color="#b8926a" />
                    <span>{event.venue}</span>
                  </div>
                  {event.dressCode && (
                    <div style={detailRowStyle}>
                      <Shirt size={15} color="#b8926a" />
                      <span>{event.dressCode}</span>
                    </div>
                  )}
                </div>
                {event.description && (
                  <p style={{
                    fontSize: '0.9rem', color: '#8c8c8c', lineHeight: 1.7,
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    paddingTop: '1rem', marginTop: '0.5rem',
                  }}>
                    {event.description}
                  </p>
                )}
                <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.75rem' }}>
                  {event.address}
                </p>
              </motion.div>
            ))}
          </section>

          {/* Travel */}
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={sectionTitleStyle}>
              <Plane size={18} color="#b8926a" /> Getting There
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
            }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                style={cardStyle}
              >
                <h3 style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  Nearest Airports
                </h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {TRAVEL.airports.map((a) => (
                    <li key={a} style={{
                      fontSize: '0.9rem', color: '#8c8c8c', lineHeight: 1.7,
                      paddingLeft: '0.75rem', borderLeft: '2px solid #f3e8d8',
                      marginBottom: '0.5rem',
                    }}>
                      {a}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                style={cardStyle}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Car size={16} color="#b8926a" />
                  <h3 style={{ fontWeight: 500, fontSize: '0.9rem' }}>Parking</h3>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#8c8c8c', lineHeight: 1.7 }}>
                  {TRAVEL.parkingInfo}
                </p>
                {TRAVEL.directions && (
                  <p style={{
                    fontSize: '0.8rem', color: '#aaa', lineHeight: 1.7,
                    marginTop: '0.75rem', paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                  }}>
                    {TRAVEL.directions}
                  </p>
                )}
              </motion.div>
            </div>
          </section>

          {/* Hotels */}
          <section>
            <h2 style={sectionTitleStyle}>
              <Hotel size={18} color="#b8926a" /> Where to Stay
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {TRAVEL.hotels.map((hotel, i) => (
                <motion.div
                  key={hotel.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.25 + i * 0.05 }}
                  style={{
                    ...cardStyle,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{
                    width: '3.5rem', height: '3.5rem', borderRadius: '0.75rem',
                    background: '#f3e8d8', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Hotel size={20} color="#b8926a" />
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h3 style={{ fontWeight: 500, fontSize: '0.95rem' }}>{hotel.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#8c8c8c', marginTop: '0.25rem' }}>
                      {hotel.address}
                    </p>
                    {hotel.notes && (
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.4rem',
                        marginTop: '0.5rem', fontSize: '0.8rem', color: '#b8926a',
                      }}>
                        <Info size={12} style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                        <span>{hotel.notes}</span>
                      </div>
                    )}
                  </div>
                  {hotel.groupRate && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#b8926a' }}>
                        {hotel.groupRate}
                      </p>
                      <p style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 500, letterSpacing: '0.1em' }}>
                        GROUP RATE
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter names={NAMES} />
    </ThemeProvider>
  );
}
