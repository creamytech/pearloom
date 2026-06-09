'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/invite/SaveTheDateReveal.tsx
//
// Suite Phase 2 (docs/SUITE-STRATEGY.md §4) — the save-the-date
// reveal experience. A guest taps the email and lands here:
// a full-viewport paper surface in the couple's SuiteTheme, an
// envelope sealed with their wax-seal monogram that opens on tap
// (or after a beat), a two-strand thread drawing across, then
// the card settling in — stylized art / cover photo / pure type,
// names in the suite display face, "Dear {guest}", calendar +
// site CTAs.
//
// Follows InviteReveal's reveal pattern (skip-envelope state +
// auto-open timer + tap-to-open overlay) but is themed entirely
// from the SuiteTheme contract instead of the locked v8 palette.
// Reduced motion: no envelope, the card shows immediately.
// All animation is transform/opacity only.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { SuiteTheme } from '@/lib/suite/theme';
import { Monogram } from '@/components/pearloom/site/Monogram';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface SaveTheDateRevealProps {
  suite: SuiteTheme;
  /** Resolved guest display name when a passport token matched. */
  guestName: string | null;
  /** Relative path to the published site (buildSitePath output). */
  siteHref: string;
  /** Host message (or the occasion-aware default). */
  message: string;
  /** Display-ready date — free-text override or long-formatted ISO. */
  dateDisplay: string | null;
  venue: string | null;
  /** Resolved server-side: stylized art > save-the-date photo > cover. */
  photoUrl: string | null;
  /** data:text/calendar href, built server-side. Null when no date. */
  icsHref: string | null;
  /** "Save the date" / "Hold the date" — occasion-aware kicker. */
  kicker: string;
}

function formatDateLong(value: string): string {
  // Free-text dates ("Summer 2027") pass through untouched.
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  try {
    const d = new Date(value.includes('T') ? value : value + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return value;
  }
}

/** Two-strand thread hairline — accent over gold — that draws in
 *  from the centre. The brand's loom verb, transform-only. */
function ThreadDraw({
  accent, gold, revealed, reduced,
}: { accent: string; gold: string; revealed: boolean; reduced: boolean }) {
  const strand = (color: string, delay: number, opacity: number) => (
    <motion.span
      aria-hidden
      initial={reduced ? false : { scaleX: 0, opacity: 0 }}
      animate={revealed ? { scaleX: 1, opacity } : { scaleX: 0, opacity: 0 }}
      transition={{ duration: 0.9, delay: reduced ? 0 : delay, ease: EASE }}
      style={{
        display: 'block', height: 1, width: '100%',
        background: color, transformOrigin: '50% 50%',
      }}
    />
  );
  return (
    <div style={{ display: 'grid', gap: 3, width: 'min(180px, 40vw)', margin: '0 auto' }}>
      {strand(accent, 0.35, 0.9)}
      {strand(gold, 0.5, 0.75)}
    </div>
  );
}

export function SaveTheDateReveal({
  suite, guestName, siteHref, message, dateDisplay, venue, photoUrl, icsHref, kicker,
}: SaveTheDateRevealProps) {
  const prefersReduced = useReducedMotion();
  const reduced = !!prefersReduced;

  // Skip the envelope entirely under reduced motion — the card
  // shows immediately (InviteReveal's pattern, store-and-compare
  // prev prop so a runtime flip still forces reveal).
  const [revealed, setRevealed] = useState(reduced);
  const [prevReduced, setPrevReduced] = useState(reduced);
  if (reduced !== prevReduced) {
    setPrevReduced(reduced);
    if (reduced) setRevealed(true);
  }
  const [calendarAdded, setCalendarAdded] = useState(false);

  useEffect(() => {
    if (reduced || revealed) return;
    // Auto-open after a beat; tap opens sooner.
    const t = setTimeout(() => setRevealed(true), 2200);
    return () => clearTimeout(t);
  }, [reduced, revealed]);

  const p = suite.palette;
  const displayNames = suite.names.filter(Boolean);
  const fontDisplay = suite.fonts.display;
  const fontBody = suite.fonts.body;
  const mono = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';

  const salutationName = guestName && guestName !== 'Guest' ? guestName : null;

  const ctaBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 22px', borderRadius: 999, textDecoration: 'none',
    fontFamily: fontBody, fontSize: '0.82rem', fontWeight: 600,
    letterSpacing: '0.02em', cursor: 'pointer',
    transition: 'opacity var(--pl-dur-fast, 180ms) var(--pl-ease-out, ease)',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: p.paper,
        color: p.ink,
        fontFamily: fontBody,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Paper grain — fixed, quiet (BRAND.md §3). */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0,
          backgroundImage: 'radial-gradient(rgba(14,13,11,0.028) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
        }}
      />

      {/* ── Sealed envelope overlay — tap to break the seal ── */}
      <AnimatePresence>
        {!revealed && !reduced && (
          <motion.button
            key="envelope"
            type="button"
            aria-label="Open the save-the-date"
            onClick={() => setRevealed(true)}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, delay: 0.25 } }}
            style={{
              position: 'fixed', inset: 0, zIndex: 30,
              background: p.paper,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 26,
              border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: fontBody,
              perspective: '1200px',
            }}
          >
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                fontFamily: mono, fontSize: '0.6rem',
                letterSpacing: '0.28em', textTransform: 'uppercase',
                color: p.inkSoft, margin: 0,
              }}
            >
              Sealed for {salutationName ?? 'you'}
            </motion.p>

            {/* Envelope — back, tucked card, flap, wax-seal monogram. */}
            <motion.div
              style={{
                position: 'relative', width: 280, height: 186,
                transformStyle: 'preserve-3d',
              }}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: [0, -4, 0], opacity: 1 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Back */}
              <svg viewBox="0 0 280 186" width={280} height={186} style={{ position: 'absolute', inset: 0 }}>
                <rect x="2" y="44" width="276" height="140" rx="3" fill={p.card} stroke={p.gold} strokeWidth="1" />
                <path d="M 2 44 L 140 132 L 278 44" fill="none" stroke={p.line} strokeWidth="1" />
              </svg>
              {/* Card tucked inside */}
              <div
                style={{
                  position: 'absolute', left: 22, right: 22, top: 58, bottom: 22,
                  background: p.section,
                  border: `1px solid ${p.line}`,
                  borderRadius: 2,
                  boxShadow: '0 2px 6px rgba(14,13,11,0.06)',
                }}
              />
              {/* Flap — pivots open on exit */}
              <motion.svg
                viewBox="0 0 280 98"
                width={280}
                height={98}
                style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '50% 100%' }}
                initial={{ rotateX: 0 }}
                animate={{ rotateX: 0 }}
                exit={{ rotateX: -180, transition: { duration: 0.9, ease: EASE } }}
              >
                <path d="M 2 98 L 140 4 L 278 98 Z" fill={p.card} stroke={p.gold} strokeWidth="1" />
              </motion.svg>
              {/* Wax-seal monogram at the flap point — lifts as the seal breaks. */}
              <motion.div
                style={{
                  position: 'absolute', left: '50%', top: 98,
                  marginLeft: -42, marginTop: -42,
                }}
                exit={{ scale: 1.18, opacity: 0, transition: { duration: 0.45, ease: EASE } }}
              >
                <Monogram
                  initials={suite.monogram.initials}
                  frame="seal"
                  size={84}
                  color={p.accent}
                  withCard={false}
                  ariaHidden
                />
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              style={{
                fontFamily: fontDisplay, fontStyle: 'italic',
                fontSize: '1rem', color: p.inkSoft, margin: 0,
              }}
            >
              Tap to break the seal
            </motion.p>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── The card ── */}
      <motion.main
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.65, delay: reduced ? 0 : 0.25, ease: EASE }}
        style={{
          position: 'relative',
          maxWidth: 580,
          margin: '0 auto',
          padding: 'clamp(36px, 7vw, 72px) clamp(18px, 5vw, 36px) 96px',
        }}
      >
        {/* Kicker + thread draw */}
        <header style={{ textAlign: 'center', marginBottom: 28 }}>
          <p
            style={{
              fontFamily: mono, fontSize: '0.62rem',
              letterSpacing: '0.3em', textTransform: 'uppercase',
              color: p.accent, margin: '0 0 14px',
            }}
          >
            {kicker}
          </p>
          <ThreadDraw accent={p.accent} gold={p.gold} revealed={revealed} reduced={reduced} />
        </header>

        {/* The settled card */}
        <section
          style={{
            background: p.card,
            border: `1px solid ${p.line}`,
            borderRadius: 'var(--pl-radius-md)',
            boxShadow: '0 8px 32px rgba(14,13,11,0.08), 0 2px 8px rgba(14,13,11,0.05)',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {photoUrl ? (
            <figure style={{ margin: 0, padding: 16, paddingBottom: 0 }}>
              <img
                src={photoUrl}
                alt={displayNames.join(' & ')}
                style={{
                  width: '100%',
                  height: 'clamp(220px, 42vw, 340px)',
                  objectFit: 'cover',
                  display: 'block',
                  border: `1px solid ${p.line}`,
                }}
              />
            </figure>
          ) : (
            // Typographic card — monogram carries the top.
            <div style={{ paddingTop: 28, display: 'grid', placeItems: 'center' }}>
              <Monogram
                initials={suite.monogram.initials}
                frame={suite.monogram.frame as Parameters<typeof Monogram>[0]['frame']}
                size={132}
                color={p.accent}
                withCard={false}
                ariaHidden
              />
            </div>
          )}

          <div style={{ padding: 'clamp(24px, 5vw, 40px)' }}>
            {/* Names in the suite display face */}
            <h1
              style={{
                fontFamily: fontDisplay,
                fontWeight: 500,
                fontSize: 'clamp(2rem, 7vw, 3.1rem)',
                lineHeight: 1.06,
                letterSpacing: '-0.015em',
                color: p.ink,
                margin: '0 0 10px',
              }}
            >
              {displayNames.length === 2 ? (
                <>
                  {displayNames[0]}
                  <span style={{ fontStyle: 'italic', color: p.accent, margin: '0 0.16em' }}>&amp;</span>
                  {displayNames[1]}
                </>
              ) : (
                displayNames[0] || 'A celebration'
              )}
            </h1>

            {dateDisplay && (
              <p
                style={{
                  fontFamily: fontDisplay, fontStyle: 'italic',
                  fontSize: 'clamp(1.05rem, 3vw, 1.3rem)',
                  color: p.inkSoft, margin: '0 0 4px',
                }}
              >
                {formatDateLong(dateDisplay)}
              </p>
            )}
            {venue && (
              <p
                style={{
                  fontFamily: mono, fontSize: '0.64rem',
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: p.inkSoft, margin: '6px 0 0', opacity: 0.85,
                }}
              >
                {venue}
              </p>
            )}

            {/* Gold hairline punctuation */}
            <div aria-hidden style={{ width: 34, height: 1, background: p.gold, margin: '22px auto' }} />

            {/* Salutation + message */}
            {salutationName && (
              <p
                style={{
                  fontFamily: fontDisplay, fontStyle: 'italic',
                  fontSize: '1.05rem', color: p.ink, margin: '0 0 8px',
                }}
              >
                Dear {salutationName},
              </p>
            )}
            <p
              style={{
                fontSize: '0.92rem', lineHeight: 1.7, color: p.inkSoft,
                margin: '0 auto', maxWidth: 420,
              }}
            >
              {message}
            </p>

            {/* CTAs */}
            <div
              style={{
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                gap: 10, marginTop: 28,
              }}
            >
              {icsHref && (
                <a
                  href={icsHref}
                  download="save-the-date.ics"
                  onClick={() => setCalendarAdded(true)}
                  style={{ ...ctaBase, background: p.ink, color: p.paper }}
                >
                  {calendarAdded ? 'Added ✓' : 'Add to calendar'}
                </a>
              )}
              <a
                href={siteHref}
                style={{
                  ...ctaBase,
                  background: 'transparent',
                  color: p.ink,
                  border: `1px solid ${p.accent}`,
                }}
              >
                Visit the site
              </a>
            </div>
          </div>
        </section>

        {/* Footer signature */}
        <footer style={{ marginTop: 36, textAlign: 'center' }}>
          <p
            style={{
              fontFamily: mono, fontSize: '0.58rem',
              letterSpacing: '0.24em', textTransform: 'uppercase',
              color: p.inkSoft, opacity: 0.7, margin: '0 0 6px',
            }}
          >
            A formal invitation will follow
          </p>
          <p
            style={{
              fontFamily: mono, fontSize: '0.55rem',
              letterSpacing: '0.24em', textTransform: 'uppercase',
              color: p.inkSoft, opacity: 0.5, margin: 0,
            }}
          >
            Sent with love · Made with Pearloom
          </p>
        </footer>
      </motion.main>
    </div>
  );
}
