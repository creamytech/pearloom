'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/LiveUpdatesFeed.tsx
// Day-of live updates timeline for wedding sites
// Auto-refreshes every 30s on the wedding date
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VibeSkin } from '@/lib/vibe-engine';

interface LiveUpdate {
  id: string;
  message: string;
  photo_url: string | null;
  type: 'ceremony' | 'reception' | 'cocktail' | 'misc';
  created_at: string;
}

export interface LiveUpdatesFeedProps {
  subdomain: string;
  weddingDate?: string;
  vibeSkin?: VibeSkin;
}

const TYPE_LABELS: Record<string, string> = {
  ceremony: 'Ceremony',
  reception: 'Reception',
  cocktail: 'Cocktail Hour',
  misc: 'Update',
};

const TYPE_COLORS: Record<string, string> = {
  ceremony: 'var(--eg-gold, #D6C6A8)',
  reception: 'var(--eg-plum, #6D597A)',
  cocktail: 'var(--eg-accent, #A3B18A)',
  misc: 'var(--eg-muted, #9A9488)',
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function isTodayWeddingDate(weddingDate?: string): boolean {
  if (!weddingDate) return false;
  try {
    const today = new Date();
    const wedding = new Date(weddingDate);
    return (
      today.getFullYear() === wedding.getFullYear() &&
      today.getMonth() === wedding.getMonth() &&
      today.getDate() === wedding.getDate()
    );
  } catch {
    return false;
  }
}

export function LiveUpdatesFeed({ subdomain, weddingDate, vibeSkin }: LiveUpdatesFeedProps) {
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const isLive = isTodayWeddingDate(weddingDate);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const headingFont = vibeSkin?.fonts?.heading || 'Playfair Display';
  const accent = vibeSkin?.palette?.accent || 'var(--eg-accent, #A3B18A)';

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch(`/api/sites/live-updates?subdomain=${encodeURIComponent(subdomain)}`);
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates || []);
      }
    } catch (err) {
      console.error('[LiveUpdatesFeed] Failed to fetch updates:', err);
    } finally {
      setLoading(false);
    }
  }, [subdomain]);

  useEffect(() => {
    fetchUpdates();

    // Auto-refresh every 30s only on wedding day
    if (isLive) {
      intervalRef.current = setInterval(fetchUpdates, 30000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchUpdates, isLive]);

  // Don't render if no updates and not the wedding day
  if (!loading && updates.length === 0 && !isLive) {
    return null;
  }

  return (
    <section
      id="live-updates"
      style={{
        padding: '5rem 2rem',
        background: 'var(--eg-bg, #F5F1E8)',
        position: 'relative',
      }}
    >
      {/* Section header */}
      <div
        style={{
          textAlign: 'center',
          maxWidth: '700px',
          margin: '0 auto 3rem',
        }}
      >
        {/* Live indicator */}
        {isLive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(163,177,138,0.12)',
              border: '1px solid rgba(163,177,138,0.3)',
              borderRadius: '100px',
              padding: '0.4rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--eg-accent, #A3B18A)',
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.35, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--eg-accent, #A3B18A)',
                display: 'inline-block',
              }}
            />
            Live Today
          </motion.div>
        )}

        <h2
          style={{
            fontFamily: `"${headingFont}", serif`,
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 600,
            color: 'var(--eg-fg, #2B2B2B)',
            margin: '0 0 1rem',
            letterSpacing: '-0.02em',
          }}
        >
          Day-Of Updates
        </h2>
        <p style={{ color: 'var(--eg-muted, #9A9488)', fontSize: '1rem', lineHeight: 1.7, margin: 0 }}>
          {isLive
            ? 'Follow along as we celebrate! Updates coming throughout the day.'
            : 'Updates from the wedding day.'}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--eg-muted, #9A9488)', padding: '2rem' }}>
          Loading updates...
        </div>
      ) : updates.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--eg-muted, #9A9488)',
            padding: '3rem 2rem',
            maxWidth: '500px',
            margin: '0 auto',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }}>📸</div>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>
            {isLive
              ? 'Updates will appear here throughout the day. Check back soon!'
              : 'No updates yet.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            position: 'relative',
          }}
        >
          {/* Vertical timeline line */}
          <div
            style={{
              position: 'absolute',
              left: '1.5rem',
              top: '1.5rem',
              bottom: '1.5rem',
              width: '2px',
              background: `linear-gradient(to bottom, ${accent}60, ${accent}20)`,
            }}
          />

          <AnimatePresence initial={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {updates.map((update, idx) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  position: 'relative',
                  paddingLeft: '0.5rem',
                }}
              >
                {/* Timeline dot */}
                {idx === updates.length - 1 && isLive ? (
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1], scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: TYPE_COLORS[update.type] || accent,
                      border: '3px solid var(--eg-bg, #F5F1E8)',
                      flexShrink: 0,
                      marginTop: '0.5rem',
                      boxShadow: `0 0 0 2px ${TYPE_COLORS[update.type] || accent}40`,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  />
                ) : (
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: TYPE_COLORS[update.type] || accent,
                    border: '3px solid var(--eg-bg, #F5F1E8)',
                    flexShrink: 0,
                    marginTop: '0.5rem',
                    boxShadow: `0 0 0 2px ${TYPE_COLORS[update.type] || accent}40`,
                    position: 'relative',
                    zIndex: 1,
                  }}
                />
                )}

                {/* Update card */}
                <div
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.8)',
                    border: '1px solid var(--eg-divider, #E6DFD2)',
                    borderRadius: '1rem',
                    padding: '1.25rem',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {/* Type badge + time */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.6rem',
                      flexWrap: 'wrap',
                      gap: '0.4rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: TYPE_COLORS[update.type] || accent,
                      }}
                    >
                      {TYPE_LABELS[update.type] || 'Update'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--eg-muted, #9A9488)',
                      }}
                    >
                      {formatTime(update.created_at)}
                    </span>
                  </div>

                  {/* Message */}
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--eg-fg, #2B2B2B)',
                      fontSize: '0.95rem',
                      lineHeight: 1.65,
                    }}
                  >
                    {update.message}
                  </p>

                  {/* Photo */}
                  {update.photo_url && (
                    <div
                      style={{
                        marginTop: '0.9rem',
                        borderRadius: '0.65rem',
                        overflow: 'hidden',
                        maxHeight: '300px',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={update.photo_url}
                        alt="Wedding moment"
                        style={{ width: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          </AnimatePresence>

          {/* Live refresh indicator */}
          {isLive && (
            <div
              style={{
                textAlign: 'center',
                marginTop: '2rem',
                color: 'var(--eg-muted, #9A9488)',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.35, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--eg-accent, #A3B18A)',
                  display: 'inline-block',
                }}
              />
              Refreshing every 30 seconds
            </div>
          )}
        </div>
      )}
    </section>
  );
}
