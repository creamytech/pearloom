'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/travel-section.tsx
// Hotels, airports, directions — full travel logistics
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Plane, Hotel, Car, ExternalLink, MapPin } from 'lucide-react';
import type { TravelInfo, HotelBlock } from '@/types';

function HotelCard({ hotel, index }: { hotel: HotelBlock; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.75, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, boxShadow: '0 16px 50px rgba(0,0,0,0.08)' }}
      style={{
        background: '#fff',
        borderRadius: '0.5rem',
        border: '1px solid rgba(0,0,0,0.07)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.4s ease, transform 0.4s ease',
      }}
    >
      {/* Top accent */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, var(--eg-accent) 0%, color-mix(in srgb, var(--eg-accent) 30%, transparent) 100%)' }} />

      <div style={{
        padding: '1.5rem 1.75rem',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'flex-start', gap: '1rem',
      }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%',
          background: 'var(--eg-accent-light)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: '0.1rem',
        }}>
          <Hotel size={16} color="var(--eg-accent)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.15rem', fontWeight: 400, color: 'var(--eg-fg)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {hotel.name}
          </h4>
          {hotel.groupRate && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'var(--eg-accent)',
              background: 'var(--eg-accent-light)', padding: '0.2rem 0.65rem',
              borderRadius: '100px', marginTop: '0.4rem', display: 'inline-block',
              border: '1px solid color-mix(in srgb, var(--eg-accent) 15%, transparent)',
            }}>
              Group Rate: {hotel.groupRate}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {hotel.address && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <MapPin size={13} color="var(--eg-muted)" style={{ flexShrink: 0, marginTop: '0.2rem', opacity: 0.6 }} />
            <span style={{ fontSize: '0.83rem', color: 'var(--eg-muted)', lineHeight: 1.55 }}>{hotel.address}</span>
          </div>
        )}

        {hotel.notes && (
          <p style={{ fontSize: '0.83rem', color: 'var(--eg-muted)', fontStyle: 'italic', lineHeight: 1.65, paddingTop: '0.25rem', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            {hotel.notes}
          </p>
        )}

        {hotel.bookingUrl && (
          <a
            href={hotel.bookingUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.6rem 1.25rem', borderRadius: '100px',
              background: 'var(--eg-fg)', color: '#fff',
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
              textDecoration: 'none', marginTop: '0.25rem', textTransform: 'uppercase',
              alignSelf: 'flex-start',
              transition: 'transform 0.3s ease',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; }}
          >
            Book Now
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </motion.div>
  );
}

interface TravelSectionProps {
  info: TravelInfo;
  title?: string;
}

export function TravelSection({ info, title = 'Getting Here' }: TravelSectionProps) {
  const hasContent = info && (
    (info.hotels && info.hotels.length > 0) ||
    (info.airports && info.airports.length > 0) ||
    info.parkingInfo ||
    info.directions
  );
  if (!hasContent) return null;

  return (
    <section style={{ padding: '8rem 2rem', background: 'var(--eg-card-bg)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          style={{ textAlign: 'center', marginBottom: '5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <div style={{ width: '50px', height: '1px', background: 'var(--eg-accent)', opacity: 0.25 }} />
            <Plane size={15} color="var(--eg-accent)" strokeWidth={1.5} style={{ opacity: 0.7 }} />
            <div style={{ width: '50px', height: '1px', background: 'var(--eg-accent)', opacity: 0.25 }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.75rem, 5.5vw, 4.25rem)',
            fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--eg-fg)',
            lineHeight: 1.05, marginBottom: '1.5rem',
          }}>
            {title}
          </h2>
          {/* Ornamental rule */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '24px', height: '1px', background: 'var(--eg-accent)', opacity: 0.35 }} />
            <div style={{ width: '4px', height: '4px', background: 'var(--eg-accent)', transform: 'rotate(45deg)', opacity: 0.5 }} />
            <div style={{ width: '24px', height: '1px', background: 'var(--eg-accent)', opacity: 0.35 }} />
          </div>
          <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', fontStyle: 'italic', lineHeight: 1.65 }}>
            Everything you need to plan your trip and stay.
          </p>
        </motion.div>

        {/* Airports */}
        {info.airports && info.airports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              marginBottom: '3rem',
              padding: '2rem 2.25rem',
              background: '#fff',
              borderRadius: '0.5rem',
              border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Plane size={16} color="var(--eg-accent)" style={{ opacity: 0.8 }} />
              <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.15rem', fontWeight: 400, color: 'var(--eg-fg)', letterSpacing: '-0.01em' }}>
                Nearest Airports
              </h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              {info.airports.map((airport, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.5rem 1.1rem',
                    background: 'var(--eg-accent-light)',
                    color: 'var(--eg-accent)',
                    borderRadius: '100px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    border: '1px solid color-mix(in srgb, var(--eg-accent) 15%, transparent)',
                  }}
                >
                  ✈ {airport}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Hotel blocks */}
        {info.hotels && info.hotels.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: '1.35rem', fontWeight: 400, color: 'var(--eg-fg)',
              marginBottom: '1.5rem',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              letterSpacing: '-0.01em',
            }}>
              <Hotel size={16} color="var(--eg-accent)" style={{ opacity: 0.8 }} />
              Where to Stay
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {info.hotels.map((hotel, i) => (
                <HotelCard key={i} hotel={hotel} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Parking / Directions */}
        {(info.parkingInfo || info.directions) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {info.parkingInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  padding: '1.75rem 2rem',
                  background: '#fff',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.1rem' }}>
                  <Car size={15} color="var(--eg-accent)" style={{ opacity: 0.8 }} />
                  <h4 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.05rem', fontWeight: 400, letterSpacing: '-0.005em' }}>Parking</h4>
                </div>
                <p style={{ color: 'var(--eg-muted)', fontSize: '0.88rem', lineHeight: 1.75 }}>{info.parkingInfo}</p>
              </motion.div>
            )}
            {info.directions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  padding: '1.75rem 2rem',
                  background: '#fff',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.1rem' }}>
                  <MapPin size={15} color="var(--eg-accent)" style={{ opacity: 0.8 }} />
                  <h4 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.05rem', fontWeight: 400, letterSpacing: '-0.005em' }}>Directions</h4>
                </div>
                <p style={{ color: 'var(--eg-muted)', fontSize: '0.88rem', lineHeight: 1.75 }}>{info.directions}</p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
