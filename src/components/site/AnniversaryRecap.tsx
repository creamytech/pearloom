'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/AnniversaryRecap.tsx
// Post-event memory book view — chapters rebuilt from live data.
// Scroll-driven, photo-heavy, warm. Not a magazine; a scrapbook.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { StoryManifest } from '@/types';

interface GalleryPhoto {
  url: string;
  uploaded_by?: string;
  caption?: string;
  created_at: string;
}

interface GuestbookEntry {
  name: string;
  message: string;
  created_at: string;
}

interface RsvpNote {
  name: string;
  message: string;
}

interface Props {
  names: [string, string];
  manifest: StoryManifest | null;
  gallery: GalleryPhoto[];
  guestbook: GuestbookEntry[];
  rsvpNotes: RsvpNote[];
  eventDate?: string;
  subdomain: string;
}

const CREAM = '#FDFAF0';
const CREAM_DEEP = '#FBF7EE';
const INK = '#18181B';
const INK_SOFT = '#4A5642';
const MUTED = '#6F6557';
const GOLD = '#C19A4B';
const GOLD_RULE = 'rgba(193,154,75,0.28)';

const FONT_DISPLAY = 'var(--pl-font-heading, "Fraunces", Georgia, serif)';
const FONT_BODY = 'var(--pl-font-body, system-ui, -apple-system, sans-serif)';
const FONT_MONO = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function yearsSince(iso?: string): number | null {
  const days = daysSince(iso);
  if (days === null || days < 0) return null;
  return Math.floor(days / 365);
}

function formatDateLong(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function AnniversaryRecap({
  names,
  gallery,
  guestbook,
  rsvpNotes,
  eventDate,
  subdomain,
}: Props) {
  const years = yearsSince(eventDate);
  const since = daysSince(eventDate);
  const displayNames = names.filter(Boolean).join(' & ') || 'The Couple';

  // Randomise photo layout sizes for scrapbook feel — stable across renders.
  const photoLayout = useMemo(() => {
    return gallery.map((p, i) => ({
      url: p.url,
      caption: p.caption,
      by: p.uploaded_by,
      // Mix of 1x1, 2x1, 1x2 cells for visual rhythm.
      span: i % 7 === 0 ? 'span 2 / span 2' : i % 5 === 0 ? 'span 1 / span 2' : 'span 1 / span 1',
    }));
  }, [gallery]);

  const topNotes = [
    ...rsvpNotes.slice(0, 6).map((n) => ({ name: n.name, message: n.message })),
    ...guestbook.slice(0, 6).map((g) => ({ name: g.name, message: g.message })),
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: CREAM,
        color: INK,
        fontFamily: FONT_BODY,
        position: 'relative',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(14,13,11,0.025) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
        }}
      />

      <main
        style={{
          position: 'relative',
          maxWidth: 1080,
          margin: '0 auto',
          padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 48px) 120px',
        }}
      >
        {/* Masthead */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 56 }}
        >
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: '0.62rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: GOLD,
              margin: '0 0 14px',
            }}
          >
            {years !== null
              ? years === 0
                ? `${since} day${since === 1 ? '' : 's'} later · a look back`
                : `${years} year${years === 1 ? '' : 's'} later · a look back`
              : 'Memory book'}
          </p>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2.8rem, 7vw, 4.4rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.018em',
              color: INK,
              margin: '0 0 10px',
            }}
          >
            {displayNames}
          </h1>
          <p
            style={{
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontSize: 'clamp(1.05rem, 2vw, 1.2rem)',
              color: INK_SOFT,
              margin: 0,
            }}
          >
            {eventDate ? formatDateLong(eventDate) : 'The day we said yes'}
          </p>
        </motion.header>

        {/* Headline stats */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 0,
            margin: '0 0 64px',
            padding: '24px 0',
            borderTop: `1px solid ${GOLD_RULE}`,
            borderBottom: `1px solid ${GOLD_RULE}`,
          }}
        >
          <Stat label="Photos shared" value={String(gallery.length)} />
          <Stat label="Messages" value={String(guestbook.length + rsvpNotes.length)} divider />
          {years !== null && <Stat label="Years together" value={String(years)} divider />}
        </section>

        {/* Notes collage */}
        {topNotes.length > 0 && (
          <section style={{ marginBottom: 72 }}>
            <SectionEyebrow>Words from the day</SectionEyebrow>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 18,
              }}
            >
              {topNotes.map((n, i) => (
                <motion.blockquote
                  key={`${n.name}-${i}`}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: (i % 4) * 0.05 }}
                  style={{
                    margin: 0,
                    padding: '20px 22px',
                    background: CREAM_DEEP,
                    border: `1px solid ${GOLD_RULE}`,
                    borderRadius: 'var(--pl-radius-xs)',
                    position: 'relative',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: -4,
                      left: 14,
                      fontFamily: FONT_DISPLAY,
                      fontStyle: 'italic',
                      fontSize: '2.6rem',
                      color: GOLD,
                      lineHeight: 1,
                    }}
                  >
                    &ldquo;
                  </span>
                  <p
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontStyle: 'italic',
                      fontSize: '1.05rem',
                      lineHeight: 1.45,
                      color: INK,
                      margin: '14px 0 12px',
                    }}
                  >
                    {n.message}
                  </p>
                  <footer
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: '0.58rem',
                      letterSpacing: '0.24em',
                      textTransform: 'uppercase',
                      color: MUTED,
                    }}
                  >
                    — {n.name}
                  </footer>
                </motion.blockquote>
              ))}
            </div>
          </section>
        )}

        {/* Photo scrapbook */}
        {gallery.length > 0 && (
          <section style={{ marginBottom: 72 }}>
            <SectionEyebrow>The gallery</SectionEyebrow>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridAutoRows: '120px',
                gap: 4,
              }}
            >
              {photoLayout.map((p, i) => (
                <motion.div
                  key={`${p.url}-${i}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.5, delay: (i % 10) * 0.02 }}
                  style={{
                    gridArea: p.span,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 'var(--pl-radius-xs)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.caption || p.by || ''}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      filter: 'saturate(0.95)',
                    }}
                  />
                  {p.by && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        left: 6,
                        padding: '2px 6px',
                        background: 'rgba(14,13,11,0.6)',
                        fontFamily: FONT_MONO,
                        fontSize: '0.52rem',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: CREAM,
                        borderRadius: 'var(--pl-radius-xs)',
                      }}
                    >
                      {p.by}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Long-form guestbook */}
        {guestbook.length > 6 && (
          <section style={{ marginBottom: 64 }}>
            <SectionEyebrow>The guestbook</SectionEyebrow>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              {guestbook.slice(6).map((g, i) => (
                <div
                  key={`${g.name}-${i}`}
                  style={{
                    padding: '18px 0',
                    borderBottom: `1px solid ${GOLD_RULE}`,
                  }}
                >
                  <p
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontStyle: 'italic',
                      fontSize: '1.05rem',
                      lineHeight: 1.5,
                      color: INK_SOFT,
                      margin: '0 0 6px',
                    }}
                  >
                    {g.message}
                  </p>
                  <p
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: '0.58rem',
                      letterSpacing: '0.24em',
                      textTransform: 'uppercase',
                      color: MUTED,
                      margin: 0,
                    }}
                  >
                    — {g.name}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {gallery.length === 0 && guestbook.length === 0 && rsvpNotes.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 24px',
              border: `1px dashed ${GOLD_RULE}`,
              borderRadius: 'var(--pl-radius-xs)',
            }}
          >
            <p
              style={{
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontSize: 'clamp(1.2rem, 2.4vw, 1.6rem)',
                color: INK_SOFT,
                margin: '0 0 10px',
              }}
            >
              Nothing to look back at — yet.
            </p>
            <p
              style={{
                fontFamily: FONT_MONO,
                fontSize: '0.62rem',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: MUTED,
                margin: 0,
              }}
            >
              This page fills in as guests share photos and messages.
            </p>
          </div>
        )}

        {/* Footer */}
        <footer
          style={{
            marginTop: 72,
            paddingTop: 32,
            borderTop: `1px solid ${GOLD_RULE}`,
            textAlign: 'center',
          }}
        >
          <a
            href={`/sites/${subdomain}`}
            style={{
              fontFamily: FONT_MONO,
              fontSize: '0.62rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: GOLD,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Back to the site →
          </a>
          <p
            style={{
              marginTop: 16,
              fontFamily: FONT_MONO,
              fontSize: '0.56rem',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            Made with love · Made with Pearloom
          </p>
        </footer>
      </main>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 22,
      }}
    >
      <span style={{ flex: 1, height: 1, background: GOLD_RULE }} />
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.6rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: MUTED,
          fontWeight: 700,
        }}
      >
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: GOLD_RULE }} />
    </div>
  );
}

function Stat({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '0 20px',
        borderLeft: divider ? `1px solid ${GOLD_RULE}` : 'none',
      }}
    >
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
          color: INK,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.56rem',
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: MUTED,
        }}
      >
        {label}
      </span>
    </div>
  );
}
