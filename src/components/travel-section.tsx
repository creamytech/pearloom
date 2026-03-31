'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/travel-section.tsx
// Hotels, airports, directions — full travel logistics
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { motion } from 'framer-motion';
import { Plane, Hotel, Car, ExternalLink, Phone } from 'lucide-react';
import { LocationPinIcon } from '@/components/icons/PearloomIcons';
import { SectionDivider } from '@/components/site/SectionDivider';
import type { TravelInfo, HotelBlock } from '@/types';

// HotelBlock from types doesn't have all fields we want — extend locally
interface HotelBlockExtended extends HotelBlock {
  phone?: string;
  starRating?: number;
  distance?: string;
}

interface TravelSectionPropsExtended {
  info: TravelInfo & {
    hotels?: HotelBlockExtended[];
    shuttleInfo?: string;
  };
  title?: string;
  subtitle?: string;
}

function StarDots({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: i < count ? 'var(--eg-gold)' : 'rgba(0,0,0,0.1)',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

function HotelCard({
  hotel,
  index,
}: {
  hotel: HotelBlockExtended;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.75, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, boxShadow: '0 16px 50px rgba(43,43,43,0.08)' }}
      style={{
        background: '#ffffff',
        borderRadius: '1.25rem',
        border: '1px solid rgba(0,0,0,0.06)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(43,43,43,0.04)',
        transition: 'box-shadow 0.4s ease, transform 0.4s ease',
      }}
    >
      {/* Top accent */}
      <div
        style={{
          height: '3px',
          background:
            'linear-gradient(90deg, var(--eg-accent) 0%, color-mix(in srgb, var(--eg-accent) 30%, transparent) 100%)',
        }}
      />

      <div
        style={{
          padding: '1.5rem 1.75rem',
          borderBottom: '1px solid rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
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
            marginTop: '0.1rem',
          }}
        >
          <Hotel size={16} color="var(--eg-accent)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: '1.15rem',
              fontWeight: 400,
              color: 'var(--eg-fg)',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              marginBottom: '0.4rem',
            }}
          >
            {hotel.name}
          </h4>
          {hotel.starRating && hotel.starRating > 0 && (
            <StarDots count={hotel.starRating} />
          )}
          {hotel.groupRate && (
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 800,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--eg-accent)',
                background: 'var(--eg-accent-light)',
                padding: '0.2rem 0.65rem',
                borderRadius: '100px',
                marginTop: '0.5rem',
                display: 'inline-block',
                border: '1px solid color-mix(in srgb, var(--eg-accent) 15%, transparent)',
              }}
            >
              Group Rate: {hotel.groupRate}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          padding: '1.25rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        {hotel.address && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <LocationPinIcon
              size={13}
              color="var(--eg-muted)"
              style={{ flexShrink: 0, marginTop: '0.2rem', opacity: 0.6 }}
            />
            <span
              style={{
                fontSize: '0.83rem',
                color: 'var(--eg-muted)',
                lineHeight: 1.55,
              }}
            >
              {hotel.address}
            </span>
          </div>
        )}

        {hotel.distance && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <Car size={13} color="var(--eg-muted)" style={{ flexShrink: 0, opacity: 0.6 }} />
            <span
              style={{
                fontSize: '0.83rem',
                color: 'var(--eg-muted)',
              }}
            >
              {hotel.distance}
            </span>
          </div>
        )}

        {hotel.phone && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <Phone size={13} color="var(--eg-muted)" style={{ flexShrink: 0, opacity: 0.6 }} />
            <a
              href={`tel:${hotel.phone}`}
              style={{
                fontSize: '0.83rem',
                color: 'var(--eg-muted)',
                textDecoration: 'none',
              }}
            >
              {hotel.phone}
            </a>
          </div>
        )}

        {hotel.notes && (
          <p
            style={{
              fontSize: '0.83rem',
              color: 'var(--eg-muted)',
              fontStyle: 'italic',
              lineHeight: 1.65,
              paddingTop: '0.25rem',
              borderTop: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            {hotel.notes}
          </p>
        )}

        {hotel.bookingUrl && (
          <a
            href={hotel.bookingUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '100px',
              background: 'var(--eg-accent)',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textDecoration: 'none',
              marginTop: '0.25rem',
              textTransform: 'uppercase' as const,
              alignSelf: 'flex-start',
              transition: 'transform 0.2s ease, background 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--eg-accent-hover)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'var(--eg-accent)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            Book Now
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </motion.div>
  );
}

export function TravelSection({
  info,
  title = 'Travel & Stay',
  subtitle = 'Everything you need to plan your trip and stay.',
}: TravelSectionPropsExtended) {
  const hasContent =
    info &&
    ((info.hotels && info.hotels.length > 0) ||
      (info.airports && info.airports.length > 0) ||
      info.parkingInfo ||
      info.directions);
  if (!hasContent) return null;

  const shuttleInfo = info.shuttleInfo;

  return (
    <section
      data-pe-section="travel" data-pe-label="Travel"
      style={{
        background: 'var(--eg-bg-section)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Wave divider at top */}
      <SectionDivider color="var(--eg-bg)" />

      <div style={{ padding: '4rem 2rem 8rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            style={{ textAlign: 'center', marginBottom: '5rem' }}
          >
            {/* Eyebrow with LocationPinIcon */}
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
              <LocationPinIcon size={20} color="var(--eg-accent)" style={{ opacity: 0.75 }} />
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
                lineHeight: 1.05,
                marginBottom: '1.5rem',
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
                marginBottom: '1.25rem',
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

          {/* Shuttle info banner */}
          {shuttleInfo && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              style={{
                marginBottom: '2.5rem',
                padding: '1rem 1.5rem',
                background: 'var(--eg-accent)',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Car size={18} color="#fff" style={{ flexShrink: 0 }} />
              <p
                style={{
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                {shuttleInfo}
              </p>
            </motion.div>
          )}

          {/* Airports */}
          {info.airports && info.airports.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{
                marginBottom: '3rem',
                padding: '2rem 2.25rem',
                background: '#ffffff',
                borderRadius: '1.25rem',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 4px 20px rgba(43,43,43,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--eg-accent-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Plane size={16} color="var(--eg-accent)" />
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--eg-font-heading)',
                    fontSize: '1.15rem',
                    fontWeight: 400,
                    color: 'var(--eg-fg)',
                    letterSpacing: '-0.01em',
                  }}
                >
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
                      border:
                        '1px solid color-mix(in srgb, var(--eg-accent) 15%, transparent)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Plane size={12} />
                    {airport}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Hotel blocks */}
          {info.hotels && info.hotels.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <h3
                style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: '1.35rem',
                  fontWeight: 400,
                  color: 'var(--eg-fg)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  letterSpacing: '-0.01em',
                }}
              >
                <Hotel size={16} color="var(--eg-accent)" style={{ opacity: 0.8 }} />
                Where to Stay
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {info.hotels.map((hotel, i) => (
                  <HotelCard key={i} hotel={hotel} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Getting There card + Parking */}
          {(info.directions || info.parkingInfo) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {/* Directions — with map-placeholder visual */}
              {info.directions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    borderRadius: '1.25rem',
                    border: '1px solid rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(43,43,43,0.03)',
                  }}
                >
                  {/* Map-placeholder visual */}
                  <div
                    style={{
                      height: '100px',
                      background: 'var(--eg-gold)',
                      backgroundImage:
                        'radial-gradient(circle, rgba(43,43,43,0.08) 1px, transparent 1px)',
                      backgroundSize: '18px 18px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LocationPinIcon size={28} color="rgba(43,43,43,0.35)" />
                  </div>
                  <div style={{ padding: '1.75rem 2rem', background: '#ffffff' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        marginBottom: '1.1rem',
                      }}
                    >
                      <LocationPinIcon size={15} color="var(--eg-accent)" style={{ opacity: 0.8 }} />
                      <h4
                        style={{
                          fontFamily: 'var(--eg-font-heading)',
                          fontSize: '1.05rem',
                          fontWeight: 400,
                          letterSpacing: '-0.005em',
                        }}
                      >
                        Getting There
                      </h4>
                    </div>
                    <p
                      style={{
                        color: 'var(--eg-muted)',
                        fontSize: '0.88rem',
                        lineHeight: 1.75,
                      }}
                    >
                      {info.directions}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Parking */}
              {info.parkingInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    padding: '1.75rem 2rem',
                    background: '#ffffff',
                    borderRadius: '1.25rem',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 4px 20px rgba(43,43,43,0.03)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      marginBottom: '1.1rem',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--eg-accent-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Car size={15} color="var(--eg-accent)" />
                    </div>
                    <h4
                      style={{
                        fontFamily: 'var(--eg-font-heading)',
                        fontSize: '1.05rem',
                        fontWeight: 400,
                        letterSpacing: '-0.005em',
                      }}
                    >
                      Parking
                    </h4>
                  </div>
                  <p
                    style={{
                      color: 'var(--eg-muted)',
                      fontSize: '0.88rem',
                      lineHeight: 1.75,
                    }}
                  >
                    {info.parkingInfo}
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
