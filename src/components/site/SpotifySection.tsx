'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/SpotifySection.tsx
// "Our Soundtrack" — Spotify playlist/track embed section.
// Below the curated embed, surfaces the "Songs your guests
// added" strip — accepted song_requests from /api/song-requests
// in public mode (no PII). Hides itself when nothing accepted.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { VibeSkin } from '@/lib/vibe-engine';

export interface SpotifySectionProps {
  spotifyUrl: string;       // e.g. https://open.spotify.com/playlist/37i9dQZF1DX...
  playlistName?: string;
  vibeSkin: VibeSkin;
  /** Site subdomain. When set, the section fetches accepted
   *  guest song requests and renders them below the playlist
   *  embed. Without it, only the curated playlist shows. */
  subdomain?: string;
}

interface AcceptedSong {
  song_title: string;
  artist: string | null;
  spotify_url: string | null;
  guest_name: string;
  created_at: string;
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

export function SpotifySection({ spotifyUrl, playlistName, vibeSkin, subdomain }: SpotifySectionProps) {
  const { palette, fonts, accentSymbol, sectionGradient } = vibeSkin;
  const [guestSongs, setGuestSongs] = useState<AcceptedSong[]>([]);

  // Pull accepted song_requests from the public-mode endpoint.
  // Fails silently — the curated embed still renders if the
  // backend can't reach Supabase.
  useEffect(() => {
    if (!subdomain) return;
    let cancelled = false;
    fetch(`/api/song-requests?subdomain=${encodeURIComponent(subdomain)}&public=1`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: null | { songs?: AcceptedSong[] }) => {
        if (cancelled || !data?.songs) return;
        setGuestSongs(data.songs);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [subdomain]);

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

        {/* Songs your guests added — surfaces accepted
            song_requests so guests see their contribution land
            and feel ownership. Hidden when nothing's been
            accepted yet (don't dangle an empty section). */}
        {guestSongs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{ marginTop: '2.5rem' }}
          >
            <div
              style={{
                fontFamily: `${fonts.body}, Inter, sans-serif`,
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: palette.muted,
                marginBottom: '1rem',
                textAlign: 'center',
              }}
            >
              Songs your guests added · {guestSongs.length}
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'grid',
                gap: '0.5rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              }}
            >
              {guestSongs.slice(0, 24).map((s, i) => (
                <li
                  key={`${s.song_title}-${i}`}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--pl-radius-md)',
                    background: `${palette.card}`,
                    border: `1px solid ${palette.accent}1a`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    fontFamily: `${fonts.body}, Inter, sans-serif`,
                  }}
                >
                  {s.spotify_url ? (
                    <a
                      href={s.spotify_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: palette.ink,
                        textDecoration: 'none',
                        wordBreak: 'break-word',
                      }}
                    >
                      {s.song_title}
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: palette.ink, wordBreak: 'break-word' }}>
                      {s.song_title}
                    </span>
                  )}
                  {s.artist && (
                    <span style={{ fontSize: '0.78rem', color: palette.muted }}>
                      {s.artist}
                    </span>
                  )}
                  <span style={{ fontSize: '0.7rem', color: palette.muted, fontStyle: 'italic', marginTop: 2 }}>
                    — {s.guest_name}
                  </span>
                </li>
              ))}
            </ul>
            {guestSongs.length > 24 && (
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '0.75rem',
                  fontSize: '0.78rem',
                  color: palette.muted,
                  fontStyle: 'italic',
                }}
              >
                + {guestSongs.length - 24} more
              </div>
            )}
          </motion.div>
        )}

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
