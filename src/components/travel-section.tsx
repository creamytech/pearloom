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
      transition={{ duration: 0.7, delay: index * 0.1 }}
      style={{
        background: '#fff',
        borderRadius: '1.25rem',
        border: '1px solid rgba(0,0,0,0.06)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{
        padding: '1.5rem 1.75rem',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'var(--eg-accent-light)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Hotel size={16} color="var(--eg-accent)" />
        </div>
        <div>
          <h4 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.15rem', fontWeight: 500, color: 'var(--eg-fg)' }}>
            {hotel.name}
          </h4>
          {hotel.groupRate && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--eg-accent)',
              background: 'var(--eg-accent-light)', padding: '0.2rem 0.6rem',
              borderRadius: '4px', marginTop: '0.2rem', display: 'inline-block',
            }}>
              Group Rate: {hotel.groupRate}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <MapPin size={14} color="var(--eg-muted)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--eg-muted)', lineHeight: 1.5 }}>{hotel.address}</span>
        </div>

        {hotel.notes && (
          <p style={{ fontSize: '0.85rem', color: 'var(--eg-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
            {hotel.notes}
          </p>
        )}

        {hotel.bookingUrl && (
          <a
            href={hotel.bookingUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 1.1rem', borderRadius: '100px',
              background: 'var(--eg-fg)', color: '#fff',
              fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em',
              textDecoration: 'none', marginTop: '0.25rem',
            }}
          >
            Book Now
            <ExternalLink size={11} />
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
          style={{ textAlign: 'center', marginBottom: '4.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'var(--eg-fg)', opacity: 0.1 }} />
            <Plane size={20} color="var(--eg-accent)" strokeWidth={1.5} />
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'var(--eg-fg)', opacity: 0.1 }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--eg-fg)',
          }}>
            {title}
          </h2>
          <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', fontStyle: 'italic', marginTop: '1rem' }}>
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
              padding: '2rem',
              background: '#fff',
              borderRadius: '1.25rem',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Plane size={18} color="var(--eg-accent)" />
              <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.25rem', fontWeight: 500, color: 'var(--eg-fg)' }}>
                Nearest Airports
              </h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {info.airports.map((airport, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: 'var(--eg-accent-light)',
                    color: 'var(--eg-accent)',
                    borderRadius: '100px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
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
              fontSize: '1.5rem', fontWeight: 400, color: 'var(--eg-fg)',
              marginBottom: '1.5rem',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
            }}>
              <Hotel size={18} color="var(--eg-accent)" />
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
                style={{
                  padding: '1.75rem',
                  background: '#fff',
                  borderRadius: '1.25rem',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <Car size={18} color="var(--eg-accent)" />
                  <h4 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.1rem', fontWeight: 500 }}>Parking</h4>
                </div>
                <p style={{ color: 'var(--eg-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>{info.parkingInfo}</p>
              </motion.div>
            )}
            {info.directions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                style={{
                  padding: '1.75rem',
                  background: '#fff',
                  borderRadius: '1.25rem',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <MapPin size={18} color="var(--eg-accent)" />
                  <h4 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.1rem', fontWeight: 500 }}>Directions</h4>
                </div>
                <p style={{ color: 'var(--eg-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>{info.directions}</p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
