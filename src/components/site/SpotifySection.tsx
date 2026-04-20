'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/SpotifySection.tsx
// "Our Soundtrack" — Spotify playlist/track embed section.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { motion } from 'framer-motion';
import type { VibeSkin } from '@/lib/vibe-engine';

export interface SpotifySectionProps {
  spotifyUrl: string;       // e.g. https://open.spotify.com/playlist/37i9dQZF1DX...
  playlistName?: string;
  vibeSkin: VibeSkin;
}

// Convert public Spotify URL → embed URL
function getEmbedUrl(url: string): string {
  return url.replace('open.spotify.com/', 'open.spotify.com/embed/') +
    '?utm_source=generator&theme=0';
}

// Validate that URL is a real Spotify link
function isValidSpotifyUrl(url: string): boolean {
  return typeof url === 'string' && url.includes('open.spotify.com/');
}

export function SpotifySection({ spotifyUrl, playlistName, vibeSkin }: SpotifySectionProps) {
  const { palette, fonts, accentSymbol, sectionGradient } = vibeSkin;

  const headingStyle: React.CSSProperties = {
    fontFamily: `${fonts.heading}, Georgia, serif`,
    color: palette.ink,
    fontWeight: 400,
    letterSpacing: '-0.025em',
    lineHeight: 1.2,
  };

  // Fallback: no URL provided
  if (!spotifyUrl || !isValidSpotifyUrl(spotifyUrl)) {
    return (
      <section
        id="soundtrack"
        style={{
          padding: 'clamp(4rem, 8vw, 7rem) clamp(1.25rem, 5vw, 3rem)',
          background: sectionGradient || palette.subtle,
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div
            style={{
              padding: '3rem 2rem',
              borderRadius: '1.5rem',
              border: `2px dashed ${palette.accent}44`,
              background: `${palette.accent}08`,
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>♪</div>
            <h3
              style={{
                ...headingStyle,
                fontSize: '1.5rem',
                marginBottom: '0.5rem',
              }}
            >
              Add Your Wedding Playlist
            </h3>
            <p
              style={{
                fontFamily: `${fonts.body}, Inter, sans-serif`,
                color: palette.muted,
                fontSize: '0.95rem',
                lineHeight: 1.6,
              }}
            >
              Share a Spotify playlist or track URL in the editor to let your
              guests listen to your love story soundtrack.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const embedUrl = getEmbedUrl(spotifyUrl);

  return (
    <section
      id="soundtrack"
      style={{
        padding: 'clamp(4rem, 8vw, 7rem) clamp(1.25rem, 5vw, 3rem)',
        background: sectionGradient || palette.subtle,
      }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '2.5rem' }}
        >
          {/* Accent divider */}
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

          <h2
            style={{
              ...headingStyle,
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              marginBottom: '0.5rem',
            }}
          >
            ♪ Our Soundtrack
          </h2>

          {playlistName && (
            <p
              style={{
                fontFamily: `${fonts.body}, Inter, sans-serif`,
                color: palette.muted,
                fontSize: '1rem',
                fontStyle: 'italic',
              }}
            >
              {playlistName}
            </p>
          )}
        </motion.div>

        {/* Spotify embed */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            borderRadius: 'var(--pl-radius-xl)',
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${palette.card}, ${palette.subtle})`,
            boxShadow: `0 16px 60px ${palette.accent}18`,
            border: `1px solid ${palette.accent}22`,
          }}
        >
          <iframe
            src={embedUrl}
            width="100%"
            height="380"
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ display: 'block', borderRadius: 'var(--pl-radius-xl)' }}
            title={playlistName ? `${playlistName} — Spotify` : 'Our Soundtrack — Spotify'}
          />
        </motion.div>

        {/* Bottom accent divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginTop: '2.5rem',
            color: palette.accent,
            opacity: 0.4,
          }}
        >
          <div style={{ width: '40px', height: '1px', background: palette.accent }} />
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.3em' }}>{accentSymbol}</span>
          <div style={{ width: '40px', height: '1px', background: palette.accent }} />
        </div>
      </div>
    </section>
  );
}
