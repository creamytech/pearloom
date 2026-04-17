'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/invite/InviteReveal.tsx
// Editorial Modernism guest-facing invitation. Cream paper,
// gold hairlines, Fraunces italic display. Mobile-first —
// info card visible in ~1s, no 4s envelope gate on small
// screens or prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Calendar, MapPin, Check } from 'lucide-react';
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
  const [calendarAdded, setCalendarAdded] = useState(false);

  useEffect(() => {
    if (skipEnvelope) {
      setRevealed(true);
      return;
    }
    // Auto-open after a beat, but user can tap to open sooner.
    const t = setTimeout(() => setRevealed(true), 1800);
    return () => clearTimeout(t);
  }, [skipEnvelope]);

  const logistics = manifest?.logistics;
  const events = useMemo<WeddingEvent[]>(() => manifest?.events ?? [], [manifest]);
  const ceremony = events.find((e) => e.type === 'ceremony') ?? events[0];
  const headlineDate = ceremony?.date || logistics?.date;
  const headlineTime = ceremony?.time || logistics?.time;
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

  // ── Practical actions (calendar / directions) ─────────────
  const icsHref = useMemo(() => {
    if (!headlineDate) return null;
    const eventName = ceremony?.name || `${displayNames}'s Celebration`;
    const descLines = [
      `Save the date for ${displayNames}`,
      headlineVenue ? `Venue: ${headlineVenue}` : '',
      headlineAddress ? `Address: ${headlineAddress}` : '',
    ].filter(Boolean);
    const dateStr = headlineDate.includes('T') ? headlineDate.slice(0, 10) : headlineDate;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return null;
    const pad = (n: number) => String(n).padStart(2, '0');

    // Parse headline time if present; default to 16:00 local.
    let hh = 16, mm = 0;
    if (headlineTime) {
      const t = headlineTime.trim().toUpperCase();
      const m12 = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
      const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
      if (m12) {
        hh = parseInt(m12[1], 10);
        mm = m12[2] ? parseInt(m12[2], 10) : 0;
        if (m12[3] === 'AM' && hh === 12) hh = 0;
        if (m12[3] === 'PM' && hh !== 12) hh += 12;
      } else if (m24) {
        hh = parseInt(m24[1], 10);
        mm = parseInt(m24[2], 10);
      }
    }
    const endHh = (hh + 3) % 24;
    const dtStart = `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
    const dtEnd = `${y}${pad(m)}${pad(d)}T${pad(endHh)}${pad(mm)}00`;
    const esc = (s: string) => s.replace(/[,;\\]/g, ' ');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Pearloom//Invitation//EN',
      'BEGIN:VEVENT',
      `UID:invite-${token}@pearloom.com`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${esc(eventName)}`,
      `LOCATION:${esc([headlineVenue, headlineAddress].filter(Boolean).join(', '))}`,
      `DESCRIPTION:${esc(descLines.join(' \\n '))}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  }, [headlineDate, headlineTime, headlineVenue, headlineAddress, ceremony?.name, displayNames, token]);

  const directionsHref = useMemo(() => {
    const q = [headlineVenue, headlineAddress].filter(Boolean).join(', ');
    if (!q) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }, [headlineVenue, headlineAddress]);

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

      {/* Envelope overlay — desktop + motion-ok only. Tap to open. */}
      <AnimatePresence>
        {!revealed && !skipEnvelope && (
          <motion.button
            key="envelope"
            type="button"
            aria-label="Open invitation"
            onClick={() => setRevealed(true)}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.55 } }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 30,
              background: CREAM,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 24,
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: FONT_BODY,
            }}
          >
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                fontFamily: FONT_MONO,
                fontSize: '0.6rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: MUTED,
                margin: 0,
              }}
            >
              An invitation for {guestName && guestName !== 'Guest' ? guestName : 'you'}
            </motion.p>
            <motion.svg
              viewBox="0 0 220 140"
              width={220}
              height={140}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ opacity: 1 }}
            >
              <rect x="1" y="36" width="218" height="102" rx="2" fill="#FFFFFF" stroke={GOLD} strokeWidth="1" />
              <motion.path
                d="M 1 36 L 110 100 L 219 36"
                fill="none"
                stroke={GOLD}
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
              <circle cx="110" cy="78" r="7" fill={CRIMSON} opacity="0.9" />
              <text
                x="110"
                y="82"
                textAnchor="middle"
                fontSize="7"
                fontFamily={FONT_DISPLAY}
                fontStyle="italic"
                fill={CREAM}
              >
                {firstName && secondName ? `${firstName[0]}${secondName[0]}` : '✦'}
              </text>
            </motion.svg>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              style={{
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontSize: '1rem',
                color: INK_SOFT,
                margin: 0,
              }}
            >
              Tap to open
            </motion.p>
          </motion.button>
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
            An Invitation
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

            {/* Practical actions — calendar + directions */}
            {(icsHref || directionsHref) && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 22,
                  paddingTop: 18,
                  borderTop: `1px solid ${GOLD_RULE}`,
                }}
              >
                {icsHref && (
                  <a
                    href={icsHref}
                    download={`invite-${token}.ics`}
                    onClick={() => setCalendarAdded(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 14px',
                      border: `1px solid ${GOLD_RULE}`,
                      background: CREAM,
                      color: INK,
                      textDecoration: 'none',
                      fontFamily: FONT_MONO,
                      fontSize: '0.6rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      borderRadius: 2,
                      transition: 'background 0.18s ease, border-color 0.18s ease',
                    }}
                  >
                    {calendarAdded ? <Check size={12} color={GOLD} /> : <Calendar size={12} />}
                    {calendarAdded ? 'Added' : 'Add to calendar'}
                  </a>
                )}
                {directionsHref && (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 14px',
                      border: `1px solid ${GOLD_RULE}`,
                      background: CREAM,
                      color: INK,
                      textDecoration: 'none',
                      fontFamily: FONT_MONO,
                      fontSize: '0.6rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      borderRadius: 2,
                    }}
                  >
                    <MapPin size={12} />
                    Directions
                  </a>
                )}
              </div>
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
              The Itinerary
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

        {/* Footer signature */}
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
            Sent with Pearloom
          </p>
        </footer>
      </motion.main>
    </div>
  );
}
