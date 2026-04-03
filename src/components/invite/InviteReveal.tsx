'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/invite/InviteReveal.tsx
// Animated digital invitation reveal with envelope unfold + inline RSVP
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoryManifest } from '@/types';

interface InviteRevealProps {
  manifest: StoryManifest | null;
  guestName: string;
  token: string;
  coupleNames: [string, string];
}

// ── Particle component ──────────────────────────────────────────
const PARTICLE_COLORS = ['#A3B18A', '#C4A96A', '#F5F1E8', '#C4A96A', '#A3B18A'];

function Particle({ index }: { index: number }) {
  const angle = (index / 12) * Math.PI * 2;
  const distance = 80 + Math.random() * 60;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  const color = PARTICLE_COLORS[index % PARTICLE_COLORS.length];
  const size = 4 + Math.random() * 5;

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
      initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
      animate={{ x, y, opacity: [0, 1, 0], scale: [0, 1, 0] }}
      transition={{
        duration: 1.2,
        delay: index * 0.04,
        ease: 'easeOut',
      }}
    />
  );
}

// ── RSVP form ──────────────────────────────────────────────────
interface RsvpFormProps {
  manifest: StoryManifest | null;
  guestName: string;
  token: string;
  coupleNames: [string, string];
}

function RsvpForm({ manifest, guestName, token, coupleNames }: RsvpFormProps) {
  const [name, setName] = useState(guestName === 'Guest' ? '' : guestName);
  const [attending, setAttending] = useState<'yes' | 'no' | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const siteId = manifest?.coupleId || manifest?.subdomain || '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || attending === null) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          guestName: name.trim(),
          status: attending === 'yes' ? 'attending' : 'declined',
          message: message.trim() || undefined,
          inviteToken: token,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Something went wrong. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center', padding: '2rem 0' }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>
          {attending === 'yes' ? '✦' : '♡'}
        </div>
        <h3
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '1.5rem',
            fontWeight: 400,
            color: '#F5F1E8',
            margin: '0 0 12px',
          }}
        >
          {attending === 'yes'
            ? `We can't wait to celebrate with you!`
            : 'Thank you for letting us know.'}
        </h3>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'rgba(245,241,232,0.55)',
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          With love,
          <br />
          <em>
            {coupleNames[0]} &amp; {coupleNames[1]}
          </em>
        </p>
      </motion.div>
    );
  }

  const rsvpDeadline = manifest?.logistics?.rsvpDeadline;

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div
        style={{
          marginBottom: 20,
          paddingBottom: 20,
          borderBottom: '1px solid rgba(196,169,106,0.15)',
        }}
      >
        <p
          style={{
            margin: '0 0 20px',
            fontSize: '0.85rem',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(196,169,106,0.7)',
            textAlign: 'center',
          }}
        >
          {rsvpDeadline ? `RSVP by ${rsvpDeadline}` : 'RSVP'}
        </p>

        {/* Attending buttons */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 20,
            justifyContent: 'center',
          }}
        >
          {(['yes', 'no'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAttending(v)}
              style={{
                flex: 1,
                maxWidth: 160,
                padding: '12px 0',
                background:
                  attending === v
                    ? v === 'yes'
                      ? 'rgba(163,177,138,0.25)'
                      : 'rgba(180,90,90,0.2)'
                    : 'transparent',
                border:
                  attending === v
                    ? v === 'yes'
                      ? '1px solid rgba(163,177,138,0.6)'
                      : '1px solid rgba(180,90,90,0.5)'
                    : '1px solid rgba(196,169,106,0.25)',
                borderRadius: 8,
                color:
                  attending === v
                    ? v === 'yes'
                      ? '#A3B18A'
                      : '#c87070'
                    : 'rgba(245,241,232,0.55)',
                fontSize: '0.8rem',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'Georgia, serif',
              }}
            >
              {v === 'yes' ? 'Joyfully Accept' : 'Regretfully Decline'}
            </button>
          ))}
        </div>

        {/* Name field */}
        <div style={{ marginBottom: 14 }}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(196,169,106,0.2)',
              borderRadius: 8,
              color: '#F5F1E8',
              fontSize: '0.95rem',
              fontFamily: 'Georgia, serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Message textarea */}
        <textarea
          placeholder="Leave a message for the couple (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(196,169,106,0.2)',
            borderRadius: 8,
            color: '#F5F1E8',
            fontSize: '0.9rem',
            fontFamily: 'Georgia, serif',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <p
          style={{
            color: '#c87070',
            fontSize: '0.85rem',
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || attending === null || !name.trim()}
        style={{
          width: '100%',
          padding: '14px',
          background:
            attending !== null && name.trim()
              ? 'rgba(196,169,106,0.18)'
              : 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(196,169,106,0.35)',
          borderRadius: 8,
          color:
            attending !== null && name.trim()
              ? '#C4A96A'
              : 'rgba(245,241,232,0.3)',
          fontSize: '0.8rem',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          cursor:
            attending !== null && name.trim() ? 'pointer' : 'not-allowed',
          fontFamily: 'Georgia, serif',
          transition: 'all 0.2s ease',
        }}
      >
        {loading ? 'Sending...' : 'Send RSVP'}
      </button>
    </form>
  );
}

// ── Main InviteReveal ──────────────────────────────────────────
export function InviteReveal({
  manifest,
  guestName,
  token,
  coupleNames,
}: InviteRevealProps) {
  // phase: 0 = sealed, 1 = shaking, 2 = card rising, 3 = full
  const [phase, setPhase] = useState(0);
  const [showParticles, setShowParticles] = useState(false);

  // Derive palette from vibeSkin, or fall back to defaults
  const palette = manifest?.vibeSkin?.palette;
  const bg = '#0E0B12';

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1500);       // flap opens
    const t2 = setTimeout(() => {
      setPhase(2);
      setShowParticles(true);
    }, 2800);                                             // particles + card starts rising
    const t3 = setTimeout(() => setShowParticles(false), 4200); // particles fade
    const t4 = setTimeout(() => setPhase(3), 3800);       // full content
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const logistics = manifest?.logistics;
  const heroImage =
    manifest?.chapters?.[0]?.images?.[manifest.chapters[0].heroPhotoIndex ?? 0]?.url;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: phase < 3 ? 'center' : 'flex-start',
        padding: phase < 3 ? '0' : '0 0 80px',
        overflow: 'hidden',
      }}
    >
      {/* ── Phase 0-2: Envelope animation ── */}
      <AnimatePresence>
        {phase < 3 && (
          <motion.div
            key="envelope-stage"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.4 } }}
          >
            {/* Soft glow behind envelope */}
            <motion.div
              style={{
                position: 'absolute',
                width: 260,
                height: 180,
                borderRadius: '50%',
                background:
                  'radial-gradient(ellipse, rgba(196,169,106,0.15) 0%, transparent 70%)',
                filter: 'blur(20px)',
              }}
              animate={{
                opacity: [0.4, 0.7, 0.4],
                scale: [1, 1.08, 1],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Envelope SVG */}
            <motion.div
              style={{ position: 'relative', zIndex: 1 }}
              animate={
                phase === 1
                  ? {
                      rotate: [0, -2, 2, -2, 2, 0],
                      transition: { duration: 0.7, ease: 'easeInOut' },
                    }
                  : {}
              }
            >
              <svg
                viewBox="0 0 300 200"
                width={300}
                height={200}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Envelope body */}
                <rect
                  x="2"
                  y="80"
                  width="296"
                  height="118"
                  rx="4"
                  stroke="rgba(196,169,106,0.6)"
                  strokeWidth="1.5"
                  fill="rgba(255,255,255,0.03)"
                />

                {/* Bottom V fold lines */}
                <path
                  d="M 2 198 L 150 120 L 298 198"
                  stroke="rgba(196,169,106,0.3)"
                  strokeWidth="1"
                />

                {/* Left diagonal */}
                <path
                  d="M 2 80 L 150 150"
                  stroke="rgba(196,169,106,0.25)"
                  strokeWidth="1"
                />
                {/* Right diagonal */}
                <path
                  d="M 298 80 L 150 150"
                  stroke="rgba(196,169,106,0.25)"
                  strokeWidth="1"
                />

                {/* Envelope flap — animates open */}
                <motion.path
                  d={
                    phase === 0
                      ? 'M 2 80 L 150 160 L 298 80' // closed: triangle pointing down into envelope
                      : 'M 2 80 L 150 0 L 298 80' // open: triangle pointing up
                  }
                  stroke="rgba(196,169,106,0.8)"
                  strokeWidth="1.5"
                  fill="rgba(14,11,18,0.95)"
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Wax seal dot (hidden once open) */}
                {phase === 0 && (
                  <circle
                    cx="150"
                    cy="130"
                    r="12"
                    stroke="rgba(196,169,106,0.5)"
                    strokeWidth="1"
                    fill="rgba(196,169,106,0.08)"
                  />
                )}
              </svg>
            </motion.div>

            {/* Particle burst */}
            {showParticles && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 0,
                  height: 0,
                }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <Particle key={i} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase 2+: Invitation card slides up ── */}
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={
          phase >= 2
            ? { y: 0, opacity: 1 }
            : { y: 200, opacity: 0 }
        }
        transition={{
          delay: phase >= 2 ? 0 : 0,
          duration: 0.8,
          type: 'spring',
          stiffness: 280,
          damping: 28,
        }}
        style={{
          width: '100%',
          maxWidth: 560,
          margin: phase >= 3 ? '0 auto' : '0 auto',
          padding: '0 16px',
          paddingTop: phase >= 3 ? 48 : 0,
          display: phase >= 2 ? 'block' : 'none',
        }}
      >
        {/* Card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(196,169,106,0.2)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {/* Hero image */}
          {heroImage && (
            <div
              style={{
                width: '100%',
                height: 240,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt={`${coupleNames[0]} & ${coupleNames[1]}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.85,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to bottom, transparent 40%, rgba(14,11,18,0.9))',
                }}
              />
            </div>
          )}

          {/* Invitation content */}
          <div style={{ padding: '40px 36px 36px', textAlign: 'center' }}>
            {/* Ornament */}
            <p
              style={{
                margin: '0 0 16px',
                fontSize: 13,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: 'rgba(196,169,106,0.65)',
              }}
            >
              You are cordially invited
            </p>

            {/* Couple names */}
            <h1
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 'clamp(2rem, 6vw, 2.8rem)',
                fontWeight: 400,
                fontStyle: 'italic',
                color: palette?.foreground || '#F5F1E8',
                margin: '0 0 8px',
                lineHeight: 1.2,
              }}
            >
              {coupleNames[0]} &amp; {coupleNames[1]}
            </h1>

            {/* Invite copy */}
            <p
              style={{
                fontSize: '0.85rem',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'rgba(245,241,232,0.5)',
                margin: '0 0 28px',
              }}
            >
              invite you to celebrate
            </p>

            {/* Date + venue */}
            {(logistics?.date || logistics?.venue) && (
              <div
                style={{
                  marginBottom: 28,
                  padding: '20px',
                  background: 'rgba(196,169,106,0.06)',
                  borderRadius: 10,
                  border: '1px solid rgba(196,169,106,0.12)',
                }}
              >
                {logistics.date && (
                  <p
                    style={{
                      margin: '0 0 6px',
                      fontSize: '1.05rem',
                      color: palette?.accent || '#C4A96A',
                      fontFamily: 'Georgia, serif',
                      fontStyle: 'italic',
                    }}
                  >
                    {logistics.date}
                    {logistics.time && ` · ${logistics.time}`}
                  </p>
                )}
                {logistics.venue && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.9rem',
                      color: 'rgba(245,241,232,0.65)',
                    }}
                  >
                    {logistics.venue}
                    {logistics.venueAddress && (
                      <>
                        <br />
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'rgba(245,241,232,0.4)',
                          }}
                        >
                          {logistics.venueAddress}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Guest greeting */}
            {guestName && guestName !== 'Guest' && (
              <p
                style={{
                  margin: '0 0 28px',
                  fontSize: '1rem',
                  color: 'rgba(245,241,232,0.7)',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                }}
              >
                Dear <strong style={{ fontWeight: 400 }}>{guestName}</strong>,
              </p>
            )}

            {/* RSVP section */}
            <div
              style={{
                borderTop: '1px solid rgba(196,169,106,0.15)',
                paddingTop: 28,
              }}
            >
              <AnimatePresence>
                {phase >= 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <RsvpForm
                      manifest={manifest}
                      guestName={guestName}
                      token={token}
                      coupleNames={coupleNames}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: '0.75rem',
            color: 'rgba(245,241,232,0.2)',
            letterSpacing: 1,
          }}
        >
          Sent with love via Pearloom
        </p>
      </motion.div>
    </div>
  );
}
