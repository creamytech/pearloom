'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/invite/InviteReveal.tsx
// Editorial Modernism guest-facing invitation. Cream paper,
// gold hairlines, Fraunces italic display. Mobile-first —
// info card visible in ~1s, no 4s envelope gate on small
// screens or prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { StoryManifest, WeddingEvent } from '@/types';
import { InviteRsvpForm } from './InviteRsvpForm';

interface InviteRevealProps {
  manifest: StoryManifest | null;
  guestName: string;
  token: string;
  coupleNames: [string, string];
}

// ── Editorial palette (locked for guest page) ────────────────
const CREAM = '#FAF7F2';
const CREAM_DEEP = '#F0ECE3';
const INK = '#18181B';
const INK_SOFT = '#3A332C';
const MUTED = '#6F6557';
const GOLD = '#B8935A';
const GOLD_MIST = 'rgba(184,147,90,0.12)';
const GOLD_RULE = 'rgba(184,147,90,0.28)';
const CRIMSON = '#8B2D2D';

const FONT_DISPLAY = 'var(--pl-font-heading, "Fraunces", Georgia, serif)';
const FONT_BODY = 'var(--pl-font-body, system-ui, -apple-system, sans-serif)';
const FONT_MONO = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';

function useIsSmall() {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const sync = () => setSmall(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return small;
}

function formatDateLong(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function InviteReveal({
  manifest,
  guestName,
  token,
  coupleNames,
}: InviteRevealProps) {
  const prefersReduced = useReducedMotion();
  const small = useIsSmall();

  // Skip envelope anim on mobile or prefers-reduced-motion.
  const skipEnvelope = prefersReduced || small;
  const [revealed, setRevealed] = useState(skipEnvelope);

  useEffect(() => {
    if (skipEnvelope) {
      setRevealed(true);
      return;
    }
    const t = setTimeout(() => setRevealed(true), 900);
    return () => clearTimeout(t);
  }, [skipEnvelope]);

  const logistics = manifest?.logistics;
  const events = useMemo<WeddingEvent[]>(() => manifest?.events ?? [], [manifest]);
  const ceremony = events.find((e) => e.type === 'ceremony') ?? events[0];
  const headlineDate = ceremony?.date || logistics?.date;
  const headlineVenue = ceremony?.venue || logistics?.venue;
  const headlineAddress = ceremony?.address || logistics?.venueAddress;

  const heroPhoto =
    manifest?.coverPhoto ||
    manifest?.heroSlideshow?.[0] ||
    manifest?.chapters?.[0]?.images?.[
      manifest?.chapters?.[0]?.heroPhotoIndex ?? 0
    ]?.url;

  const rsvpIntro = manifest?.poetry?.rsvpIntro;
  const displayNames = coupleNames.filter(Boolean).join(' & ') || 'The Couple';
  const firstName = coupleNames[0] || '';
  const secondName = coupleNames[1] || '';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: CREAM,
        color: INK,
        fontFamily: FONT_BODY,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Paper grain */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(14,13,11,0.025) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Envelope overlay — desktop + motion-ok only */}
      <AnimatePresence>
        {!revealed && !skipEnvelope && (
          <motion.div
            key="envelope"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.45 } }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 30,
              background: CREAM,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.svg
              viewBox="0 0 220 140"
              width={200}
              height={128}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <rect
                x="1"
                y="36"
                width="218"
                height="102"
                rx="2"
                fill="none"
                stroke={GOLD}
                strokeWidth="1"
              />
              <motion.path
                d="M 1 36 L 110 100 L 219 36"
                fill="none"
                stroke={GOLD}
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, delay: 0.1 }}
              />
              <circle cx="110" cy="78" r="6" fill={CRIMSON} opacity="0.85" />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <motion.main
        initial={skipEnvelope ? false : { opacity: 0, y: 12 }}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          maxWidth: 640,
          margin: '0 auto',
          padding: 'clamp(40px, 8vw, 88px) clamp(20px, 5vw, 40px) 120px',
        }}
      >
        {/* Masthead */}
        <header style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: '0.66rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: MUTED,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ width: 18, height: 1, background: GOLD }} />
            You&rsquo;re invited
            <span style={{ width: 18, height: 1, background: GOLD }} />
          </div>
        </header>

        {/* Hero photo — optional */}
        {heroPhoto && (
          <figure
            style={{
              margin: '0 0 36px',
              borderTop: `1px solid ${GOLD_RULE}`,
              borderBottom: `1px solid ${GOLD_RULE}`,
              padding: '24px 0',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroPhoto}
              alt={displayNames}
              style={{
                width: '100%',
                height: 'clamp(220px, 38vw, 360px)',
                objectFit: 'cover',
                display: 'block',
                filter: 'saturate(0.92) contrast(0.98)',
              }}
            />
          </figure>
        )}

        {/* Editorial heading */}
        <section style={{ textAlign: 'center', marginBottom: 48 }}>
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: '0.62rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: MUTED,
              margin: '0 0 22px',
            }}
          >
            Together with their families
          </p>

          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2.4rem, 8vw, 4rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: INK,
              margin: '0 0 4px',
            }}
          >
            {firstName}
          </h1>
          <p
            style={{
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 400,
              color: GOLD,
              fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
              margin: '6px 0',
            }}
          >
            &amp;
          </p>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2.4rem, 8vw, 4rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: INK,
              margin: '4px 0 28px',
            }}
          >
            {secondName}
          </h1>

          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: '0.64rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: MUTED,
              margin: '0 0 8px',
            }}
          >
            Request the honour of your company
          </p>
        </section>

        {/* Logistics plate */}
        {(headlineDate || headlineVenue) && (
          <section
            style={{
              textAlign: 'center',
              padding: '32px 20px',
              margin: '0 0 48px',
              background: CREAM_DEEP,
              border: `1px solid ${GOLD_RULE}`,
              borderRadius: 2,
            }}
          >
            {headlineDate && (
              <p
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
                  fontStyle: 'italic',
                  color: INK,
                  margin: '0 0 6px',
                }}
              >
                {formatDateLong(headlineDate)}
              </p>
            )}
            {(ceremony?.time || logistics?.time) && (
              <p
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: '0.72rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: MUTED,
                  margin: '0 0 18px',
                }}
              >
                {ceremony?.time || logistics?.time}
              </p>
            )}
            {headlineVenue && (
              <>
                <div
                  style={{
                    width: 32,
                    height: 1,
                    background: GOLD,
                    margin: '14px auto',
                  }}
                />
                <p
                  style={{
                    fontSize: '0.95rem',
                    color: INK_SOFT,
                    margin: '0 0 4px',
                  }}
                >
                  {headlineVenue}
                </p>
                {headlineAddress && (
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: MUTED,
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {headlineAddress}
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {/* All events (if more than one) */}
        {events.length > 1 && (
          <section style={{ marginBottom: 48 }}>
            <p
              style={{
                fontFamily: FONT_MONO,
                fontSize: '0.6rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: MUTED,
                textAlign: 'center',
                margin: '0 0 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <span style={{ flex: 1, height: 1, background: GOLD_RULE }} />
              The day at a glance
              <span style={{ flex: 1, height: 1, background: GOLD_RULE }} />
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {events.map((e) => (
                <li
                  key={e.id}
                  style={{
                    padding: '16px 0',
                    borderBottom: `1px solid ${GOLD_RULE}`,
                    display: 'grid',
                    gridTemplateColumns: small ? '1fr' : '120px 1fr',
                    gap: small ? 6 : 20,
                    alignItems: 'baseline',
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: '0.66rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: GOLD,
                    }}
                  >
                    {e.time || formatDateLong(e.date).split(',')[0]}
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontStyle: 'italic',
                        fontSize: '1.05rem',
                        color: INK,
                        margin: '0 0 4px',
                      }}
                    >
                      {e.name}
                    </p>
                    <p style={{ fontSize: '0.82rem', color: MUTED, margin: 0 }}>
                      {e.venue}
                      {e.dressCode ? ` · ${e.dressCode}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Guest salutation + RSVP form */}
        <section
          style={{
            marginTop: 56,
            paddingTop: 32,
            borderTop: `1px solid ${GOLD_RULE}`,
          }}
        >
          {guestName && guestName !== 'Guest' && (
            <p
              style={{
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontSize: '1.1rem',
                color: INK_SOFT,
                margin: '0 0 8px',
                textAlign: 'center',
              }}
            >
              Dear {guestName},
            </p>
          )}
          {rsvpIntro && (
            <p
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.7,
                color: INK_SOFT,
                textAlign: 'center',
                margin: '0 auto 28px',
                maxWidth: 460,
              }}
            >
              {rsvpIntro}
            </p>
          )}

          <InviteRsvpForm
            manifest={manifest}
            guestName={guestName}
            token={token}
            coupleNames={coupleNames}
            events={events}
          />
        </section>

        {/* Footer colophon */}
        <footer
          style={{
            marginTop: 64,
            paddingTop: 20,
            borderTop: `1px solid ${GOLD_RULE}`,
            textAlign: 'center',
          }}
        >
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
            Sent with love · Made with Pearloom
          </p>
        </footer>
      </motion.main>
    </div>
  );
}
