'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/RegistrySection.tsx
// Public-facing registry section on the live wedding site.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import type { VibeSkin } from '@/lib/vibe-engine';
import type { RegistrySource } from '@/types';
import { RegistryCard } from '@/components/registry/RegistryCard';

export interface RegistrySectionProps {
  siteId: string;
  vibeSkin: VibeSkin;
  coupleNames: [string, string];
}

export function RegistrySection({ siteId, vibeSkin, coupleNames }: RegistrySectionProps) {
  const [sources, setSources] = useState<RegistrySource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/registry?siteId=${encodeURIComponent(siteId)}`)
      .then((r) => r.json())
      .then((json) => {
        setSources(json.sources || []);
      })
      .catch(() => {
        setSources([]);
      })
      .finally(() => setLoading(false));
  }, [siteId]);

  // Don't render section at all if no registries
  if (!loading && sources.length === 0) return null;

  const { palette, fonts, sectionLabels, accentSymbol, sectionGradient } = vibeSkin;

  const headingStyle: React.CSSProperties = {
    fontFamily: `${fonts.heading}, Georgia, serif`,
    color: palette.ink,
    fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
    fontWeight: 700,
    margin: '0 0 0.5rem',
    lineHeight: 1.2,
  };

  const subtitleStyle: React.CSSProperties = {
    fontFamily: `${fonts.body}, Inter, sans-serif`,
    color: palette.muted,
    fontSize: '1rem',
    margin: 0,
    lineHeight: 1.6,
  };

  const sectionLabel = sectionLabels.registry || 'The Registry';

  return (
    <section
      id="registry"
      style={{
        padding: 'clamp(4rem, 8vw, 7rem) clamp(1.25rem, 5vw, 3rem)',
        background: sectionGradient || palette.subtle,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Heading area */}
        <div style={{ marginBottom: '3rem' }}>
          {/* Accent divider top */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              color: palette.accent,
            }}
          >
            <div
              style={{
                width: '60px',
                height: '1px',
                background: `linear-gradient(90deg, transparent, ${palette.accent})`,
              }}
            />
            <span style={{ fontSize: '1rem', letterSpacing: '0.2em' }}>{accentSymbol}</span>
            <div
              style={{
                width: '60px',
                height: '1px',
                background: `linear-gradient(270deg, transparent, ${palette.accent})`,
              }}
            />
          </div>

          <h2 style={headingStyle}>{sectionLabel}</h2>

          <p style={subtitleStyle}>
            {coupleNames[0]} &amp; {coupleNames[1]} have thoughtfully curated these registries:
          </p>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: '200px',
                  borderRadius: '1rem',
                  background: `${palette.card}`,
                  opacity: 0.5,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        )}

        {/* Registry cards grid */}
        {!loading && sources.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.25rem',
              textAlign: 'left',
            }}
          >
            {sources.map((source) => (
              <RegistryCard key={source.id} source={source} editable={false} />
            ))}
          </div>
        )}

        {/* Accent divider bottom */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginTop: '3rem',
            color: palette.accent,
            opacity: 0.5,
          }}
        >
          <div
            style={{
              width: '40px',
              height: '1px',
              background: palette.accent,
            }}
          />
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.3em' }}>{accentSymbol}</span>
          <div
            style={{
              width: '40px',
              height: '1px',
              background: palette.accent,
            }}
          />
        </div>
      </div>
    </section>
  );
}
