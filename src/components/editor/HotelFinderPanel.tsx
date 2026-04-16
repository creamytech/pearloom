'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/HotelFinderPanel.tsx
// AI hotel finder — suggests nearby hotels for the venue.
// Rewritten in the editorial chrome: Fraunces italic hotel names,
// mono uppercase meta tags, gold-accented group-rate callouts on
// cream paper. Presented as a floating dialog over the canvas.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { X, MapPin, Star, ExternalLink, Plus, Loader2 } from 'lucide-react';
import type { StoryManifest, HotelBlock } from '@/types';
import {
  panelFont,
  panelText,
  panelTracking,
  panelWeight,
  panelLineHeight,
} from './panel';

interface HotelResult {
  name: string;
  address: string;
  distance: string;
  priceTier: 'budget' | 'mid' | 'luxury';
  description: string;
  groupRateTip: string;
  bookingUrl: string;
  amenities: string[];
}

interface HotelFinderPanelProps {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  onClose: () => void;
}

const PRICE_TIER_STYLES: Record<
  string,
  { bg: string; border: string; color: string; label: string }
> = {
  budget: {
    bg: 'color-mix(in srgb, #4a9b8a 14%, transparent)',
    border: 'color-mix(in srgb, #4a9b8a 32%, transparent)',
    color: '#3a8273',
    label: 'Budget',
  },
  mid: {
    bg: 'color-mix(in srgb, #5b8abf 14%, transparent)',
    border: 'color-mix(in srgb, #5b8abf 32%, transparent)',
    color: '#4a75a4',
    label: 'Mid-range',
  },
  luxury: {
    bg: 'color-mix(in srgb, #8c64b4 14%, transparent)',
    border: 'color-mix(in srgb, #8c64b4 32%, transparent)',
    color: '#74509e',
    label: 'Luxury',
  },
};

const animationCSS = `
@keyframes pl-hotel-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
@keyframes pl-hotel-fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pl-hotel-slide-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
@keyframes pl-hotel-spin { to { transform: rotate(360deg); } }
`;

const eyebrowStyle: React.CSSProperties = {
  fontFamily: panelFont.mono,
  fontSize: panelText.meta,
  fontWeight: panelWeight.bold,
  letterSpacing: panelTracking.widest,
  textTransform: 'uppercase',
  color: 'var(--pl-chrome-text-faint)',
  lineHeight: 1,
};

export function HotelFinderPanel({ manifest, onChange, onClose }: HotelFinderPanelProps) {
  const defaultAddress =
    manifest.logistics?.venueAddress || manifest.events?.[0]?.address || '';

  const [venueAddress, setVenueAddress] = useState(defaultAddress);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HotelResult[]>([]);
  const [error, setError] = useState('');
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());

  const findHotels = useCallback(async () => {
    if (!venueAddress.trim()) {
      setError('Please enter a venue address');
      return;
    }
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch('/api/ai-hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueAddress: venueAddress.trim(),
          venueCity: '',
          eventDate: manifest.logistics?.date || '',
          guestCount: undefined,
          budget: undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Search failed');
      }

      const data = await res.json();
      setResults(data.hotels || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [venueAddress, manifest.logistics?.date]);

  const addHotelToSite = useCallback(
    (hotel: HotelResult) => {
      const travel = manifest.travelInfo || { airports: [], hotels: [] };
      const newHotel: HotelBlock = {
        name: hotel.name,
        address: hotel.address,
        bookingUrl: hotel.bookingUrl || '',
        groupRate: hotel.groupRateTip || '',
        notes: `${hotel.distance} from venue. ${hotel.description}`,
      };
      onChange({
        ...manifest,
        travelInfo: {
          ...travel,
          hotels: [...(travel.hotels || []), newHotel],
        },
      });
      setAddedNames((prev) => new Set(prev).add(hotel.name));
    },
    [manifest, onChange],
  );

  return (
    <>
      <style>{animationCSS}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background:
            'color-mix(in srgb, var(--pl-chrome-text) 38%, transparent)',
          backdropFilter: 'blur(4px)',
          animation: 'pl-hotel-fade-in 0.2s ease-out',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '580px',
            maxHeight: '85vh',
            borderRadius: '14px',
            border: '1px solid var(--pl-chrome-border)',
            background: 'var(--pl-chrome-surface)',
            boxShadow:
              '0 28px 90px color-mix(in srgb, var(--pl-chrome-text) 22%, transparent)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'pl-hotel-fade-in 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 22px 16px',
              borderBottom: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 24%, transparent)',
              background:
                'color-mix(in srgb, var(--pl-chrome-accent) 3%, var(--pl-chrome-surface))',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={eyebrowStyle}>Field guide · Hotels</span>
              <span
                style={{
                  fontFamily: panelFont.display,
                  fontStyle: 'italic',
                  fontSize: '1.1rem',
                  fontWeight: panelWeight.regular,
                  color: 'var(--pl-chrome-text)',
                  letterSpacing: '-0.015em',
                  lineHeight: 1.15,
                }}
              >
                Find hotels near the venue
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none',
                border: '1px solid var(--pl-chrome-border)',
                cursor: 'pointer',
                color: 'var(--pl-chrome-text-muted)',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>

          {/* Search area */}
          <div
            style={{
              padding: '18px 22px 16px',
              borderBottom: '1px solid var(--pl-chrome-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <label style={eyebrowStyle}>Venue address</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="123 Garden Lane, Newport, RI"
                style={{
                  flex: 1,
                  padding: '8px 2px 7px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--pl-chrome-border)',
                  borderRadius: 0,
                  fontFamily: panelFont.body,
                  fontSize: 'max(16px, 0.88rem)',
                  color: 'var(--pl-chrome-text)',
                  outline: 'none',
                  transition: 'border-color 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderBottomColor = 'var(--pl-chrome-accent)';
                  e.currentTarget.style.borderBottomWidth = '1.5px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderBottomColor = 'var(--pl-chrome-border)';
                  e.currentTarget.style.borderBottomWidth = '1px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') findHotels();
                }}
              />
              <button
                type="button"
                onClick={findHotels}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '99px',
                  border: '1px solid var(--pl-chrome-accent)',
                  background: loading
                    ? 'color-mix(in srgb, var(--pl-chrome-accent) 18%, transparent)'
                    : 'var(--pl-chrome-accent)',
                  color: loading ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-accent-ink)',
                  fontFamily: panelFont.mono,
                  fontSize: panelText.meta,
                  fontWeight: panelWeight.bold,
                  letterSpacing: panelTracking.widest,
                  textTransform: 'uppercase',
                  cursor: loading ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
                  lineHeight: 1,
                }}
              >
                {loading ? (
                  <Loader2 size={11} strokeWidth={2} style={{ animation: 'pl-hotel-spin 1s linear infinite' }} />
                ) : (
                  <MapPin size={11} strokeWidth={1.75} />
                )}
                {loading ? 'Searching' : 'Find hotels'}
              </button>
            </div>
            {error && (
              <p
                style={{
                  fontFamily: panelFont.body,
                  fontSize: panelText.hint,
                  color: 'var(--pl-chrome-danger)',
                  margin: '4px 0 0',
                  lineHeight: panelLineHeight.snug,
                }}
              >
                {error}
              </p>
            )}
          </div>

          {/* Results area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 22px' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: '10px',
                      padding: '16px',
                      background: 'color-mix(in srgb, var(--pl-chrome-accent) 4%, transparent)',
                      border: '1px solid var(--pl-chrome-border)',
                      animation: 'pl-hotel-pulse 1.5s ease-in-out infinite',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  >
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <div
                        style={{
                          width: '55%',
                          height: '16px',
                          borderRadius: '8px',
                          background: 'color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)',
                        }}
                      />
                      <div
                        style={{
                          width: '60px',
                          height: '16px',
                          borderRadius: '8px',
                          background: 'color-mix(in srgb, var(--pl-chrome-accent) 10%, transparent)',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: '80%',
                        height: '12px',
                        borderRadius: '6px',
                        background: 'color-mix(in srgb, var(--pl-chrome-accent) 8%, transparent)',
                        marginBottom: '8px',
                      }}
                    />
                    <div
                      style={{
                        width: '65%',
                        height: '12px',
                        borderRadius: '6px',
                        background: 'color-mix(in srgb, var(--pl-chrome-accent) 6%, transparent)',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {!loading && results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {results.map((hotel, i) => {
                  const tier = PRICE_TIER_STYLES[hotel.priceTier] || PRICE_TIER_STYLES.mid;
                  const isAdded = addedNames.has(hotel.name);
                  return (
                    <div
                      key={i}
                      style={{
                        borderRadius: '12px',
                        padding: '16px 18px',
                        background: 'var(--pl-chrome-surface)',
                        border: '1px solid var(--pl-chrome-border)',
                        animation: 'pl-hotel-slide-in 0.35s ease-out backwards',
                        animationDelay: `${i * 0.08}s`,
                        transition: 'box-shadow 0.2s, border-color 0.2s',
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--pl-chrome-shadow)';
                        (e.currentTarget as HTMLElement).style.borderColor =
                          'color-mix(in srgb, var(--pl-chrome-accent) 32%, var(--pl-chrome-border))';
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--pl-chrome-border)';
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                          marginBottom: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                          <span
                            style={{
                              fontFamily: panelFont.mono,
                              fontSize: panelText.meta,
                              fontWeight: panelWeight.bold,
                              letterSpacing: panelTracking.widest,
                              textTransform: 'uppercase',
                              color: 'var(--pl-chrome-accent)',
                            }}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <h3
                            style={{
                              fontFamily: panelFont.display,
                              fontStyle: 'italic',
                              fontSize: '1.05rem',
                              fontWeight: panelWeight.regular,
                              color: 'var(--pl-chrome-text)',
                              margin: 0,
                              lineHeight: 1.15,
                              letterSpacing: '-0.015em',
                            }}
                          >
                            {hotel.name}
                          </h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '99px',
                              fontFamily: panelFont.mono,
                              fontSize: panelText.meta,
                              fontWeight: panelWeight.bold,
                              letterSpacing: panelTracking.wider,
                              textTransform: 'uppercase',
                              background: tier.bg,
                              border: `1px solid ${tier.border}`,
                              color: tier.color,
                              whiteSpace: 'nowrap',
                              lineHeight: 1.2,
                            }}
                          >
                            {tier.label}
                          </span>
                          <span
                            style={{
                              fontFamily: panelFont.mono,
                              fontSize: panelText.meta,
                              letterSpacing: panelTracking.wider,
                              textTransform: 'uppercase',
                              color: 'var(--pl-chrome-text-muted)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {hotel.distance}
                          </span>
                        </div>
                      </div>

                      <p
                        style={{
                          fontFamily: panelFont.body,
                          fontSize: panelText.body,
                          color: 'var(--pl-chrome-text)',
                          lineHeight: panelLineHeight.normal,
                          margin: '0 0 10px',
                        }}
                      >
                        {hotel.description}
                      </p>

                      {hotel.amenities?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                          {hotel.amenities.map((amenity, j) => (
                            <span
                              key={j}
                              style={{
                                padding: '3px 9px',
                                borderRadius: '99px',
                                fontFamily: panelFont.mono,
                                fontSize: panelText.meta,
                                fontWeight: panelWeight.bold,
                                letterSpacing: panelTracking.wider,
                                textTransform: 'uppercase',
                                background: 'color-mix(in srgb, var(--pl-chrome-accent) 6%, transparent)',
                                border: '1px solid var(--pl-chrome-border)',
                                color: 'var(--pl-chrome-text-soft)',
                                lineHeight: 1.2,
                              }}
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}

                      {hotel.groupRateTip && (
                        <div
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background:
                              'color-mix(in srgb, var(--pl-chrome-accent) 8%, transparent)',
                            border: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 26%, transparent)',
                            marginBottom: '12px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '4px',
                            }}
                          >
                            <Star size={10} strokeWidth={1.75} color="var(--pl-chrome-accent)" />
                            <span
                              style={{
                                fontFamily: panelFont.mono,
                                fontSize: panelText.meta,
                                fontWeight: panelWeight.bold,
                                letterSpacing: panelTracking.widest,
                                textTransform: 'uppercase',
                                color: 'var(--pl-chrome-accent)',
                              }}
                            >
                              Group rate tip
                            </span>
                          </div>
                          <p
                            style={{
                              fontFamily: panelFont.body,
                              fontSize: panelText.hint,
                              color: 'var(--pl-chrome-text)',
                              lineHeight: panelLineHeight.snug,
                              margin: 0,
                            }}
                          >
                            {hotel.groupRateTip}
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => addHotelToSite(hotel)}
                          disabled={isAdded}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '8px 14px',
                            borderRadius: '99px',
                            border: isAdded ? '1px solid var(--pl-chrome-border)' : '1px solid var(--pl-chrome-accent)',
                            background: isAdded
                              ? 'color-mix(in srgb, var(--pl-chrome-accent) 6%, transparent)'
                              : 'var(--pl-chrome-accent)',
                            color: isAdded ? 'var(--pl-chrome-text-soft)' : 'var(--pl-chrome-accent-ink)',
                            fontFamily: panelFont.mono,
                            fontSize: panelText.meta,
                            fontWeight: panelWeight.bold,
                            letterSpacing: panelTracking.widest,
                            textTransform: 'uppercase',
                            cursor: isAdded ? 'default' : 'pointer',
                            transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
                            lineHeight: 1,
                          }}
                        >
                          <Plus size={11} strokeWidth={1.75} />
                          {isAdded ? 'Added' : 'Add to site'}
                        </button>
                        {hotel.bookingUrl && (
                          <a
                            href={hotel.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '8px 14px',
                              borderRadius: '99px',
                              border: '1px solid var(--pl-chrome-border)',
                              background: 'transparent',
                              color: 'var(--pl-chrome-text-soft)',
                              fontFamily: panelFont.mono,
                              fontSize: panelText.meta,
                              fontWeight: panelWeight.bold,
                              letterSpacing: panelTracking.widest,
                              textTransform: 'uppercase',
                              textDecoration: 'none',
                              transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
                              lineHeight: 1,
                            }}
                          >
                            <ExternalLink size={10} strokeWidth={1.75} />
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && results.length === 0 && !error && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '44px 24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'color-mix(in srgb, var(--pl-chrome-accent) 8%, transparent)',
                    color: 'var(--pl-chrome-accent)',
                    border: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 24%, transparent)',
                  }}
                >
                  <MapPin size={18} strokeWidth={1.5} />
                </span>
                <p
                  style={{
                    fontFamily: panelFont.display,
                    fontStyle: 'italic',
                    fontSize: '1rem',
                    fontWeight: panelWeight.regular,
                    color: 'var(--pl-chrome-text)',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Enter your venue address above
                </p>
                <p
                  style={{
                    fontFamily: panelFont.body,
                    fontSize: panelText.hint,
                    color: 'var(--pl-chrome-text-muted)',
                    margin: 0,
                    maxWidth: 280,
                    lineHeight: panelLineHeight.normal,
                  }}
                >
                  We&apos;ll suggest nearby hotels — curated for your guests, with group-rate tips included.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
