'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/StoryMapSection.tsx
// Interactive Leaflet map showing all chapter locations as a
// pinned journey. Uses dynamic import to avoid SSR issues.
// ─────────────────────────────────────────────────────────────

import dynamic from 'next/dynamic';
import type { Chapter } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';

const MapWithNoSSR = dynamic(() => import('./LeafletMap'), { ssr: false });

interface StoryMapSectionProps {
  chapters: Chapter[];
  vibeSkin: VibeSkin;
  coupleNames: [string, string];
}

export function StoryMapSection({ chapters, vibeSkin, coupleNames }: StoryMapSectionProps) {
  const locatedChapters = chapters.filter(ch => ch.location !== null);
  const hasLocations = locatedChapters.length > 0;

  const { palette, accentSymbol, fonts } = vibeSkin;

  return (
    <section
      style={{
        background: palette.subtle,
        padding: '7rem 2rem',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{
            display: 'inline-block',
            fontSize: '0.65rem',
            fontFamily: fonts.body,
            fontWeight: 700,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: palette.accent,
            marginBottom: '1rem',
          }}>
            Your Journey
          </span>

          <h2 style={{
            fontFamily: fonts.heading,
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 400,
            color: palette.ink,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: '0 0 0.75rem',
          }}>
            A Love Story Mapped
          </h2>

          <div style={{
            fontSize: '1.5rem',
            color: palette.accent,
            marginBottom: '0.5rem',
            opacity: 0.7,
          }}>
            {accentSymbol}
          </div>

          <p style={{
            fontSize: '1rem',
            color: palette.muted,
            fontFamily: fonts.body,
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Every place {coupleNames[0]} &amp; {coupleNames[1]} have shared — mapped as a journey.
          </p>
        </div>

        {/* Map container or empty state */}
        {hasLocations ? (
          <div style={{
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 48px rgba(0,0,0,0.10), 0 2px 16px rgba(0,0,0,0.06)',
          }}>
            <MapWithNoSSR
              chapters={locatedChapters}
              accentColor={palette.accent}
            />
          </div>
        ) : (
          <div style={{
            borderRadius: '16px',
            background: palette.card,
            border: `1px solid ${palette.accent2}33`,
            padding: '5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1.25rem', opacity: 0.45 }}>
              🗺
            </div>
            <p style={{
              fontFamily: fonts.heading,
              fontSize: '1.15rem',
              fontStyle: 'italic',
              color: palette.muted,
              maxWidth: '420px',
              margin: '0 auto',
              lineHeight: 1.75,
            }}>
              Your love story mapped — add locations to your chapters to see your journey.
            </p>
          </div>
        )}

        {/* Chapter location pills */}
        {hasLocations && locatedChapters.length > 1 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.6rem',
            justifyContent: 'center',
            marginTop: '2rem',
          }}>
            {locatedChapters.map((ch, i) => (
              <div
                key={ch.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.3rem 0.9rem',
                  borderRadius: '100px',
                  background: palette.card,
                  border: `1px solid ${palette.accent}33`,
                  fontSize: '0.7rem',
                  color: palette.foreground,
                  fontFamily: fonts.body,
                  letterSpacing: '0.05em',
                }}
              >
                <span style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: palette.accent,
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                {ch.location!.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
