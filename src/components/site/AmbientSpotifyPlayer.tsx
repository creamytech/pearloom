'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/AmbientSpotifyPlayer.tsx
//
// A subtle floating companion to SpotifySection. When the guest
// scrolls past the soundtrack section, a compact Spotify player
// fades in at the bottom-right so music stays one tap away as
// they keep browsing. Fades out when the main section re-enters
// view. Guest can dismiss it for the session.
//
// Uses Spotify's standard embed iframe with the smaller 80px
// compact variant — no privileged API access required.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music } from 'lucide-react';

interface AmbientSpotifyPlayerProps {
  spotifyUrl: string;
  /** id of the soundtrack <section> to observe; defaults to 'soundtrack' */
  anchorId?: string;
  accent?: string;
}

function getEmbedUrl(url: string): string {
  return (
    url.replace('open.spotify.com/', 'open.spotify.com/embed/') +
    '?utm_source=generator&theme=0'
  );
}

function isValidSpotifyUrl(url: string): boolean {
  return typeof url === 'string' && url.includes('open.spotify.com/');
}

export function AmbientSpotifyPlayer({
  spotifyUrl,
  anchorId = 'soundtrack',
  accent = '#B8935A',
}: AmbientSpotifyPlayerProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!isValidSpotifyUrl(spotifyUrl)) return;
    try {
      if (sessionStorage.getItem('pl:ambient-spotify-dismissed') === '1') {
        setDismissed(true);
        return;
      }
    } catch {
      /* session store unavailable */
    }

    const anchor = document.getElementById(anchorId);
    if (!anchor) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const pastSection = entry.boundingClientRect.top < 0 && !entry.isIntersecting;
        setShow(pastSection);
      },
      { threshold: 0, rootMargin: '-10% 0px 0px 0px' },
    );
    observer.observe(anchor);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [spotifyUrl, anchorId]);

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem('pl:ambient-spotify-dismissed', '1');
    } catch {
      /* ignore */
    }
  }

  if (!isValidSpotifyUrl(spotifyUrl) || dismissed) return null;

  const embedUrl = getEmbedUrl(spotifyUrl);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            right: 'clamp(12px, 3vw, 24px)',
            bottom: 'clamp(12px, 3vw, 24px)',
            zIndex: 40,
            width: expanded ? 'min(420px, calc(100vw - 32px))' : 'min(320px, calc(100vw - 32px))',
            background: 'rgba(20, 18, 14, 0.82)',
            backdropFilter: 'blur(18px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
            border: `1px solid ${accent}55`,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow:
              '0 20px 60px rgba(0,0,0,0.32), 0 4px 12px rgba(0,0,0,0.24)',
          }}
        >
          {/* Header strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px 8px 14px',
              borderBottom: `1px solid ${accent}22`,
            }}
          >
            <Music size={12} color={accent} />
            <span
              style={{
                flex: 1,
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: '0.56rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#F0E8D4',
              }}
            >
              Our Soundtrack
            </span>
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Collapse' : 'Expand'}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: `1px solid ${accent}55`,
                borderRadius: 4,
                color: accent,
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: '0.54rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {expanded ? 'Mini' : 'Expand'}
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss player"
              style={{
                padding: 4,
                background: 'transparent',
                border: 'none',
                color: '#9B8A66',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Embedded iframe — 80px compact by default, 232 expanded */}
          <iframe
            src={embedUrl}
            width="100%"
            height={expanded ? 232 : 80}
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Ambient Spotify player"
            style={{ display: 'block', border: 'none', background: 'transparent' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
