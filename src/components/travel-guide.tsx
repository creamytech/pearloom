'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/travel-guide.tsx
// AI-powered public travel guide component — shows getting-there
// tips, hotel highlights, local suggestions, and weather.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Plane, Hotel, MapPin, Utensils, Sun, Cloud, Snowflake, Umbrella, Compass } from 'lucide-react';

// ── CSS Keyframes (injected once) ─────────────────────────────
const KEYFRAMES_ID = 'pearloom-travel-guide-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes tg-fadeInUp {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes tg-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes tg-scaleIn {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// ── Types ─────────────────────────────────────────────────────

export interface TravelSuggestion {
  name: string;
  type?: string;
  note?: string;
  description?: string;
}

interface TravelGuideData {
  gettingThere: string;
  restaurants: Array<{ name: string; type: string; note: string }>;
  activities: Array<{ name: string; description: string }>;
  weather: { temp: string; description: string; packingTip: string };
}

interface TravelGuideProps {
  venueAddress?: string;
  venueCity: string;
  eventDate?: string;
  suggestions?: TravelSuggestion[];
}

// ── Season heuristic (no API needed) ──────────────────────────
function getSeasonIcon(date?: string) {
  if (!date) return Sun;
  const month = new Date(date).getMonth();
  if (month >= 11 || month <= 1) return Snowflake;
  if (month >= 2 && month <= 4) return Cloud;
  if (month >= 5 && month <= 8) return Sun;
  return Umbrella;
}

// ── Glass card wrapper ────────────────────────────────────────
function GlassCard({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.50)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      padding: 'clamp(1.25rem, 3vw, 2rem)',
      animation: `tg-fadeInUp 0.6s ease-out ${delay}s both`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Icon header ───────────────────────────────────────────────
function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px',
        background: 'rgba(163, 177, 138, 0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} style={{ color: 'var(--pl-accent, #5C6B3F)' }} />
      </div>
      <h3 style={{
        margin: 0,
        fontFamily: 'var(--font-heading, inherit)',
        fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
        fontWeight: 700,
        color: 'var(--pl-fg, #1A1A1A)',
        letterSpacing: '-0.01em',
      }}>
        {title}
      </h3>
    </div>
  );
}

// ── Distance badge ────────────────────────────────────────────
function DistanceBadge({ text }: { text: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '100px',
      background: 'rgba(163, 177, 138, 0.15)',
      color: 'var(--pl-accent, #5C6B3F)',
      fontSize: '0.72rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      {text}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────
export function TravelGuide({ venueAddress, venueCity, eventDate, suggestions }: TravelGuideProps) {
  const [guideData, setGuideData] = useState<TravelGuideData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    injectKeyframes();
  }, []);

  useEffect(() => {
    if (!venueCity) return;
    // If suggestions were passed as props, use them directly
    if (suggestions && suggestions.length > 0) return;

    let cancelled = false;
    async function fetchGuide() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/ai-travel-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ venueAddress, venueCity, eventDate, occasion: 'wedding' }),
        });
        if (!res.ok) {
          // Don't show error to public guests, just silently fail
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!cancelled) setGuideData(data);
      } catch {
        // Silently fail for public-facing component
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchGuide();
    return () => { cancelled = true; };
  }, [venueAddress, venueCity, eventDate, suggestions]);

  const SeasonIcon = getSeasonIcon(eventDate);

  // Build display data from props or API response
  const restaurants = guideData?.restaurants || [];
  const activities = guideData?.activities || [];
  const gettingThere = guideData?.gettingThere || '';
  const weather = guideData?.weather;

  // If nothing to show yet and still loading
  if (loading) {
    return (
      <div style={{
        padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 2rem)',
        textAlign: 'center',
        animation: 'tg-fadeIn 0.4s ease-out both',
      }}>
        <div style={{
          width: '32px', height: '32px', margin: '0 auto 1rem',
          border: '3px solid rgba(163, 177, 138, 0.2)',
          borderTopColor: 'var(--pl-accent, #5C6B3F)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: '0.88rem', color: 'var(--pl-muted, #9A9488)', fontStyle: 'italic' }}>
          Preparing your travel guide...
        </p>
      </div>
    );
  }

  // Nothing to render
  if (!gettingThere && restaurants.length === 0 && activities.length === 0 && !weather) return null;

  return (
    <div style={{
      padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 2rem)',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      {/* Title */}
      <div style={{
        textAlign: 'center',
        marginBottom: 'clamp(1.5rem, 4vw, 3rem)',
        animation: 'tg-fadeInUp 0.5s ease-out both',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-heading, inherit)',
          fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
          fontWeight: 700,
          color: 'var(--pl-fg, #1A1A1A)',
          margin: '0 0 0.5rem',
          letterSpacing: '-0.02em',
        }}>
          Your Travel Guide
        </h2>
        <p style={{
          fontSize: 'clamp(0.85rem, 2vw, 1rem)',
          color: 'var(--pl-muted, #9A9488)',
          margin: 0,
          maxWidth: '500px',
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: 1.6,
        }}>
          Everything you need to know for your trip to {venueCity}
        </p>
      </div>

      {/* Grid: 3-col on desktop, stacked on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: 'clamp(1rem, 2vw, 1.5rem)',
      }}>
        {/* Getting There */}
        {gettingThere && (
          <GlassCard delay={0.1}>
            <SectionHeader icon={Plane} title="Getting There" />
            <p style={{
              fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
              color: 'var(--pl-fg, #1A1A1A)',
              lineHeight: 1.7,
              margin: 0,
              opacity: 0.85,
            }}>
              {gettingThere}
            </p>
            {venueAddress && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: 'rgba(163, 177, 138, 0.08)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}>
                <MapPin size={14} style={{ color: 'var(--pl-accent, #5C6B3F)', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--pl-fg, #1A1A1A)', opacity: 0.7, lineHeight: 1.5 }}>
                  {venueAddress}
                </span>
              </div>
            )}
          </GlassCard>
        )}

        {/* Where to Stay */}
        {restaurants.length > 0 && (
          <GlassCard delay={0.2}>
            <SectionHeader icon={Utensils} title="Where to Eat" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {restaurants.map((r, i) => (
                <div key={i} style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  animation: `tg-scaleIn 0.4s ease-out ${0.3 + i * 0.1}s both`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--pl-fg, #1A1A1A)',
                    }}>
                      {r.name}
                    </span>
                    <DistanceBadge text={r.type} />
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.82rem',
                    color: 'var(--pl-muted, #9A9488)',
                    lineHeight: 1.5,
                  }}>
                    {r.note}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Things to Do */}
        {activities.length > 0 && (
          <GlassCard delay={0.3}>
            <SectionHeader icon={Compass} title="Things to Do" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {activities.map((a, i) => (
                <div key={i} style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  animation: `tg-scaleIn 0.4s ease-out ${0.4 + i * 0.1}s both`,
                }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: 'var(--pl-fg, #1A1A1A)',
                    display: 'block',
                    marginBottom: '4px',
                  }}>
                    {a.name}
                  </span>
                  <p style={{
                    margin: 0,
                    fontSize: '0.82rem',
                    color: 'var(--pl-muted, #9A9488)',
                    lineHeight: 1.5,
                  }}>
                    {a.description}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      {/* Weather Forecast Card */}
      {weather && (
        <div style={{
          marginTop: 'clamp(1rem, 2vw, 1.5rem)',
          animation: 'tg-fadeInUp 0.6s ease-out 0.5s both',
        }}>
          <GlassCard style={{
            background: 'linear-gradient(135deg, rgba(163, 177, 138, 0.12), rgba(163, 177, 138, 0.05))',
            border: '1px solid rgba(163, 177, 138, 0.2)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(1rem, 3vw, 2rem)',
              flexWrap: 'wrap',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'rgba(163, 177, 138, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <SeasonIcon size={24} style={{ color: 'var(--pl-accent, #5C6B3F)' }} />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{
                  fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading, inherit)',
                  color: 'var(--pl-fg, #1A1A1A)',
                  marginBottom: '4px',
                }}>
                  {weather.temp}
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '0.88rem',
                  color: 'var(--pl-fg, #1A1A1A)',
                  opacity: 0.75,
                  lineHeight: 1.5,
                }}>
                  {weather.description}
                </p>
              </div>
              {weather.packingTip && (
                <div style={{
                  padding: '0.65rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.82rem',
                  color: 'var(--pl-fg, #1A1A1A)',
                  opacity: 0.8,
                  lineHeight: 1.5,
                  maxWidth: '280px',
                }}>
                  <strong style={{ color: 'var(--pl-accent, #5C6B3F)' }}>Packing tip:</strong>{' '}
                  {weather.packingTip}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
