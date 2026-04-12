'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/HotelFinderPanel.tsx
// AI Hotel Finder — suggests nearby hotels for the venue
// Glass aesthetic with CSS animations (no Framer Motion)
// ─────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { X, MapPin, Star, ExternalLink, Plus } from 'lucide-react';
import { lbl } from './editor-utils';
import type { StoryManifest, HotelBlock } from '@/types';

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

const PRICE_TIER_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  budget: { bg: 'rgba(74, 155, 138, 0.15)', color: '#4a9b8a', label: 'Budget' },
  mid: { bg: 'rgba(100, 140, 200, 0.15)', color: '#5b8abf', label: 'Mid-Range' },
  luxury: { bg: 'rgba(140, 100, 180, 0.15)', color: '#8c64b4', label: 'Luxury' },
};

/* CSS keyframe animation styles injected inline via <style> */
const animationCSS = `
@keyframes pl-hotel-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
@keyframes pl-hotel-fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pl-hotel-slide-in {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
`;

export function HotelFinderPanel({ manifest, onChange, onClose }: HotelFinderPanelProps) {
  // Pre-populate address from manifest
  const defaultAddress = manifest.logistics?.venueAddress
    || manifest.events?.[0]?.address
    || '';

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

  const addHotelToSite = useCallback((hotel: HotelResult) => {
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
    setAddedNames(prev => new Set(prev).add(hotel.name));
  }, [manifest, onChange]);

  return (
    <>
      <style>{animationCSS}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        animation: 'pl-hotel-fade-in 0.2s ease-out',
      }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          width: '100%', maxWidth: '560px', maxHeight: '85vh',
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px', border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'pl-hotel-fade-in 0.3s ease-out',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={16} style={{ color: '#18181B' }} />
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#18181B', letterSpacing: '-0.01em' }}>
                Find Hotels Near Venue
              </span>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#71717A', padding: '4px', display: 'flex',
              borderRadius: '6px', transition: 'background 0.15s',
            }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.05)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Search area */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <label style={{ ...lbl, color: '#71717A' }}>Venue Address</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={venueAddress}
                onChange={e => setVenueAddress(e.target.value)}
                placeholder="123 Garden Lane, Newport, RI"
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)',
                  fontSize: 'max(16px, 0.85rem)', color: '#18181B',
                  outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#A1A1AA';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24,24,27,0.06)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onKeyDown={e => { if (e.key === 'Enter') findHotels(); }}
              />
              <button
                onClick={findHotels}
                disabled={loading}
                style={{
                  padding: '10px 18px', borderRadius: '12px', border: 'none',
                  background: loading ? '#E4E4E7' : '#18181B',
                  color: '#fff', fontSize: '0.82rem', fontWeight: 700,
                  cursor: loading ? 'default' : 'pointer',
                  letterSpacing: '0.04em', whiteSpace: 'nowrap',
                  transition: 'background 0.15s, transform 0.1s',
                }}
                onMouseOver={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#8fa47a'; }}
                onMouseOut={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#18181B'; }}
              >
                {loading ? 'Searching...' : 'Find Hotels'}
              </button>
            </div>
            {error && (
              <p style={{ fontSize: '0.82rem', color: '#e87a7a', marginTop: '8px' }}>{error}</p>
            )}
          </div>

          {/* Results area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {/* Loading skeletons */}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    borderRadius: '14px', padding: '16px',
                    background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.04)',
                    animation: 'pl-hotel-pulse 1.5s ease-in-out infinite',
                    animationDelay: `${i * 0.15}s`,
                  }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ width: '55%', height: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.08)' }} />
                      <div style={{ width: '60px', height: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.06)' }} />
                    </div>
                    <div style={{ width: '80%', height: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.05)', marginBottom: '8px' }} />
                    <div style={{ width: '65%', height: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.04)' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {!loading && results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {results.map((hotel, i) => {
                  const tier = PRICE_TIER_STYLES[hotel.priceTier] || PRICE_TIER_STYLES.mid;
                  const isAdded = addedNames.has(hotel.name);
                  return (
                    <div
                      key={i}
                      style={{
                        borderRadius: '14px', padding: '16px',
                        background: 'rgba(255,255,255,0.6)',
                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        animation: 'pl-hotel-slide-in 0.35s ease-out backwards',
                        animationDelay: `${i * 0.08}s`,
                        transition: 'box-shadow 0.2s, border-color 0.2s',
                      }}
                      onMouseOver={e => {
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(24,24,27,0.12)';
                      }}
                      onMouseOut={e => {
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.06)';
                      }}
                    >
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                        <h3 style={{
                          fontFamily: 'var(--pl-font-heading, Georgia, serif)',
                          fontSize: '1rem', fontWeight: 700, color: '#18181B',
                          margin: 0, lineHeight: 1.3,
                        }}>
                          {hotel.name}
                        </h3>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          {/* Distance badge */}
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem',
                            fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#71717A',
                            whiteSpace: 'nowrap',
                          }}>
                            {hotel.distance}
                          </span>
                          {/* Price tier pill */}
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem',
                            fontWeight: 700, background: tier.bg, color: tier.color,
                            whiteSpace: 'nowrap',
                          }}>
                            {tier.label}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p style={{
                        fontSize: '0.82rem', color: '#18181B',
                        lineHeight: 1.55, margin: '0 0 10px',
                      }}>
                        {hotel.description}
                      </p>

                      {/* Amenities */}
                      {hotel.amenities?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                          {hotel.amenities.map((amenity, j) => (
                            <span key={j} style={{
                              padding: '2px 7px', borderRadius: '4px', fontSize: '0.68rem',
                              fontWeight: 600, background: 'rgba(24,24,27,0.06)',
                              color: '#18181B',
                            }}>
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Group rate tip */}
                      {hotel.groupRateTip && (
                        <div style={{
                          padding: '10px 12px', borderRadius: '10px',
                          background: 'rgba(196,169,106,0.08)',
                          border: '1px solid rgba(196,169,106,0.15)',
                          marginBottom: '12px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Star size={11} style={{ color: '#C4A96A' }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b09550', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              Group Rate Tip
                            </span>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: '#18181B', lineHeight: 1.5, margin: 0 }}>
                            {hotel.groupRateTip}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => addHotelToSite(hotel)}
                          disabled={isAdded}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '7px 14px', borderRadius: '8px', border: 'none',
                            background: isAdded ? 'rgba(24,24,27,0.08)' : '#18181B',
                            color: isAdded ? '#18181B' : '#fff',
                            fontSize: '0.78rem', fontWeight: 700, cursor: isAdded ? 'default' : 'pointer',
                            letterSpacing: '0.03em', transition: 'background 0.15s',
                          }}
                          onMouseOver={e => { if (!isAdded) (e.currentTarget as HTMLElement).style.background = '#8fa47a'; }}
                          onMouseOut={e => { if (!isAdded) (e.currentTarget as HTMLElement).style.background = '#18181B'; }}
                        >
                          <Plus size={12} />
                          {isAdded ? 'Added' : 'Add to Site'}
                        </button>
                        {hotel.bookingUrl && (
                          <a
                            href={hotel.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '5px',
                              padding: '7px 14px', borderRadius: '8px',
                              border: '1px solid rgba(0,0,0,0.08)', background: 'transparent',
                              color: '#71717A', fontSize: '0.78rem',
                              fontWeight: 600, textDecoration: 'none',
                              transition: 'background 0.15s',
                            }}
                            onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'; }}
                            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <ExternalLink size={11} />
                            View Hotel
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {!loading && results.length === 0 && !error && (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                color: '#71717A',
              }}>
                <MapPin size={28} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Enter your venue address above
                </p>
                <p style={{ fontSize: '0.78rem', opacity: 0.6 }}>
                  AI will suggest nearby hotels perfect for your guests
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
