'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / WelcomeOverlay.tsx — Editorial site-intro screen
//
// Redesign (2026-04): drops the generic white-card/gray-grey
// splash in favour of an Editorial Modernism dispatch —
// masthead kicker, Fraunces italic display names, gold hairlines,
// cream paper, and a short "keyboard grimoire" that makes the
// hidden shortcuts (⌘K palette · / Ask Pear) discoverable on
// first open without a modal tour.
//
// First visit  → "In this issue…" with three affordances.
// Returning    → time-of-day greeting, stat marginalia, editorial
//                dispatch line ("Five guests await a reply").
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { StoryManifest } from '@/types';

interface WelcomeOverlayProps {
  onDismiss: () => void;
  siteName?: string;
  manifest?: StoryManifest;
  coupleNames?: [string, string];
}

const VISIT_KEY = 'pearloom_editor_visits';

function getVisitCount(): number {
  try { return parseInt(localStorage.getItem(VISIT_KEY) || '0', 10); } catch { return 0; }
}

function incrementVisit(): void {
  try { localStorage.setItem(VISIT_KEY, String(getVisitCount() + 1)); } catch {}
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface SiteStats {
  rsvpCount: number;
  attending: number;
  pending: number;
  declined: number;
  guestbookCount: number;
  chapterCount: number;
  eventCount: number;
  photoCount: number;
  hasBlocks: boolean;
  marginalia: Array<{ label: string; value: string }>;
}

function getSiteStats(manifest?: StoryManifest): SiteStats | null {
  if (!manifest) return null;
  const rsvps = manifest.rsvps || [];
  const rsvpCount = rsvps.length;
  const attending = rsvps.filter(r => r.status === 'attending').length;
  const pending = rsvps.filter(r => r.status === 'pending').length;
  const declined = rsvps.filter(r => r.status === 'declined').length;
  const guestbookCount =
    (manifest as unknown as { guestbookMessages?: unknown[] }).guestbookMessages?.length || 0;
  const chapterCount = manifest.chapters?.length || 0;
  const eventCount = manifest.events?.length || 0;
  const photoCount =
    (manifest.chapters?.reduce((sum, ch) => sum + (ch.images?.length || 0), 0) || 0) +
    (manifest.coverPhoto ? 1 : 0) +
    (manifest.heroSlideshow?.filter(Boolean)?.length || 0);
  const hasBlocks = (manifest.blocks?.length || 0) > 0;

  const marginalia: SiteStats['marginalia'] = [];
  if (attending > 0) marginalia.push({ label: 'Attending', value: String(attending) });
  if (pending > 0) marginalia.push({ label: 'Pending', value: String(pending) });
  if (chapterCount > 0) marginalia.push({ label: 'Chapters', value: String(chapterCount) });
  if (eventCount > 0) marginalia.push({ label: 'Events', value: String(eventCount) });
  if (photoCount > 0) marginalia.push({ label: 'Photos', value: String(photoCount) });

  return { rsvpCount, attending, pending, declined, guestbookCount, chapterCount, eventCount, photoCount, hasBlocks, marginalia };
}

// Pick a warm, specific dispatch line for returning users based on state.
function getDispatch(stats: SiteStats | null): string {
  if (!stats) return 'Pick up where you left off.';
  if (stats.pending > 0) {
    return stats.pending === 1
      ? 'One guest still owes a reply.'
      : `${stats.pending} guests still owe a reply.`;
  }
  if (stats.attending > 0) {
    return stats.attending === 1
      ? 'One guest is planning to join you.'
      : `${stats.attending} guests are planning to join you.`;
  }
  if (stats.guestbookCount > 0) {
    return stats.guestbookCount === 1
      ? 'A new note is waiting in the guestbook.'
      : `${stats.guestbookCount} new notes are waiting in the guestbook.`;
  }
  if (stats.hasBlocks) return 'Your site is taking shape — keep going.';
  return 'Pick up where you left off.';
}

// ── Palette (editorial) ─────────────────────────────────────────
const CREAM = 'var(--pl-cream, #F5EFE2)';
const CREAM_CARD = 'var(--pl-cream-card, #FBF7EE)';
const INK = 'var(--pl-ink, #0E0D0B)';
const INK_SOFT = 'var(--pl-ink-soft, #3A332C)';
const MUTED = 'var(--pl-muted, #6F6557)';
const GOLD = 'var(--pl-gold, #B8935A)';
const GOLD_RULE = 'color-mix(in oklab, var(--pl-gold, #B8935A) 35%, transparent)';
const GOLD_MIST = 'color-mix(in oklab, var(--pl-gold, #B8935A) 14%, transparent)';
const OLIVE = 'var(--pl-olive, #5C6B3F)';

const FONT_DISPLAY = 'var(--pl-font-heading, "Fraunces", Georgia, serif)';
const FONT_BODY = 'var(--pl-font-body, system-ui, sans-serif)';
const FONT_MONO = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';

export function WelcomeOverlay({ onDismiss, siteName, manifest, coupleNames }: WelcomeOverlayProps) {
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    const visits = getVisitCount();
    setIsReturning(visits > 0);
    incrementVisit();
  }, []);

  const stats = getSiteStats(manifest);
  const firstName = coupleNames?.[0] || '';
  const secondName = coupleNames?.[1] || '';
  const displayNames = [firstName, secondName].filter(Boolean).join(' & ');
  const greeting = getTimeGreeting();
  const dispatch = getDispatch(stats);

  // Edition metadata — deterministic but feels authored.
  const today = new Date();
  const dateLine = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // ── Frame ────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
        background: CREAM,
        padding: 'clamp(20px, 5vw, 48px)',
      }}
    >
      {/* Paper grain overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(14,13,11,0.028) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />

      {/* Pearloom mark — top corners */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 'clamp(20px, 4vw, 40px)',
          left: 'clamp(20px, 4vw, 40px)',
          right: 'clamp(20px, 4vw, 40px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: FONT_MONO,
          fontSize: 'clamp(0.56rem, 1.3vw, 0.66rem)',
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: MUTED,
          pointerEvents: 'none',
        }}
      >
        <span>Pearloom</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {dateLine}
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: GOLD }} />
          {isReturning ? 'Welcome back' : 'Your site is ready'}
        </span>
      </div>

      {/* Core card */}
      <motion.div
        onClick={(e) => {
          // First visit: swallow clicks inside the card so users can read.
          // Click-outside (on the backdrop) still dismisses.
          e.stopPropagation();
        }}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 640,
          padding: 'clamp(36px, 5vw, 56px) clamp(28px, 5vw, 64px)',
          background: CREAM_CARD,
          border: `1px solid ${GOLD_RULE}`,
          boxShadow:
            '0 1px 0 rgba(184,147,90,0.18) inset, 0 24px 72px rgba(40,28,12,0.12), 0 6px 18px rgba(40,28,12,0.06)',
          borderRadius: 2,
          cursor: 'default',
        }}
      >
        {/* Gold hairline top-inner */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 8,
            left: 18,
            right: 18,
            height: 1,
            background: GOLD,
            opacity: 0.55,
          }}
        />

        {/* Kicker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 22,
            fontFamily: FONT_MONO,
            fontSize: '0.62rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: GOLD,
          }}
        >
          <span style={{ width: 18, height: 1, background: GOLD }} />
          {isReturning ? `${greeting}${firstName ? `, ${firstName}` : ''}` : 'Three ways to start'}
          <span style={{ width: 18, height: 1, background: GOLD }} />
        </motion.div>

        {/* Display name(s) */}
        {displayNames ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: 'center', marginBottom: 22 }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(2.4rem, 6.5vw, 4rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.018em',
                color: INK,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              {firstName}
            </h1>
            {secondName && (
              <>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontStyle: 'italic',
                    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                    color: GOLD,
                    margin: '4px 0',
                  }}
                >
                  &amp;
                </div>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: FONT_DISPLAY,
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 'clamp(2.4rem, 6.5vw, 4rem)',
                    lineHeight: 1.02,
                    letterSpacing: '-0.018em',
                    color: INK,
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  {secondName}
                </h1>
              </>
            )}
          </motion.div>
        ) : (
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            style={{
              margin: '0 0 22px',
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2rem, 5vw, 2.8rem)',
              lineHeight: 1.08,
              color: INK,
              textAlign: 'center',
              letterSpacing: '-0.012em',
            }}
          >
            Your site is ready.
          </motion.h1>
        )}

        {/* Rule */}
        <div
          aria-hidden
          style={{
            width: 40,
            height: 1,
            background: GOLD,
            margin: '0 auto 20px',
          }}
        />

        {/* Body — diverges by first-visit vs returning */}
        {isReturning ? (
          <>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              style={{
                margin: '0 auto 24px',
                maxWidth: 420,
                textAlign: 'center',
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontSize: 'clamp(1.05rem, 2.1vw, 1.2rem)',
                lineHeight: 1.5,
                color: INK_SOFT,
              }}
            >
              {dispatch}
            </motion.p>

            {stats && stats.marginalia.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.75 }}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 0,
                  marginBottom: 30,
                  borderTop: `1px solid ${GOLD_RULE}`,
                  borderBottom: `1px solid ${GOLD_RULE}`,
                  paddingBlock: 14,
                }}
              >
                {stats.marginalia.slice(0, 4).map((item, i) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '0 clamp(14px, 3vw, 24px)',
                      borderLeft: i === 0 ? 'none' : `1px solid ${GOLD_RULE}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
                        color: INK,
                        lineHeight: 1,
                      }}
                    >
                      {item.value}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: '0.58rem',
                        letterSpacing: '0.24em',
                        textTransform: 'uppercase',
                        color: MUTED,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}

            <motion.button
              type="button"
              onClick={onDismiss}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'block',
                margin: '0 auto',
                padding: '14px 28px',
                background: INK,
                color: CREAM,
                border: `1px solid ${INK}`,
                borderRadius: 2,
                fontFamily: FONT_MONO,
                fontSize: '0.68rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Continue editing
            </motion.button>
          </>
        ) : (
          <>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              style={{
                margin: '0 auto 28px',
                maxWidth: 440,
                textAlign: 'center',
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontSize: 'clamp(1.05rem, 2.1vw, 1.22rem)',
                lineHeight: 1.5,
                color: INK_SOFT,
              }}
            >
              Click anything on the canvas to edit it. Type{' '}
              <KBD>/</KBD> to ask Pear for help, or <KBD>⌘K</KBD> to jump to any panel.
            </motion.p>

            {/* Three-way affordance list — editorial index */}
            <motion.ul
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.78 }}
              style={{
                listStyle: 'none',
                margin: '0 0 30px',
                padding: 0,
                borderTop: `1px solid ${GOLD_RULE}`,
              }}
            >
              <AffordanceRow
                n="01"
                label="Edit on the page"
                detail="Click any section to change it in place."
                shortcut="Click"
              />
              <AffordanceRow
                n="02"
                label="Ask Pear"
                detail="Your AI co-host. Rewrites copy, generates content, suggests fixes."
                shortcut="/"
              />
              <AffordanceRow
                n="03"
                label="Jump anywhere"
                detail="Open any panel from one search box."
                shortcut="⌘K"
              />
            </motion.ul>

            <motion.button
              type="button"
              onClick={onDismiss}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.95 }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'block',
                margin: '0 auto',
                padding: '14px 32px',
                background: INK,
                color: CREAM,
                border: `1px solid ${INK}`,
                borderRadius: 2,
                fontFamily: FONT_MONO,
                fontSize: '0.68rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Begin editing
            </motion.button>
          </>
        )}

        {/* Footer mark */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          style={{
            marginTop: 28,
            paddingTop: 14,
            borderTop: `1px solid ${GOLD_RULE}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            fontFamily: FONT_MONO,
            fontSize: '0.56rem',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: MUTED,
          }}
        >
          <span>Made with Pearloom</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: OLIVE }} />
            {siteName || 'Your site'}
          </span>
        </motion.div>
      </motion.div>

      {/* Dismiss hint — pinned to the bottom, click-backdrop reminder */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        style={{
          position: 'absolute',
          bottom: 'clamp(20px, 3vw, 32px)',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT_MONO,
          fontSize: '0.56rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: MUTED,
          pointerEvents: 'none',
        }}
      >
        Tap anywhere to close
      </motion.div>
    </motion.div>
  );
}

// ── Inline helpers ──────────────────────────────────────────
function KBD({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 6px',
        margin: '0 2px',
        borderRadius: 3,
        background: GOLD_MIST,
        border: `1px solid ${GOLD_RULE}`,
        fontFamily: FONT_MONO,
        fontSize: '0.72em',
        letterSpacing: '0.08em',
        color: INK,
        fontStyle: 'normal',
        lineHeight: 1.2,
      }}
    >
      {children}
    </kbd>
  );
}

function AffordanceRow({
  n,
  label,
  detail,
  shortcut,
}: {
  n: string;
  label: string;
  detail: string;
  shortcut: string;
}) {
  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '48px 1fr auto',
        alignItems: 'center',
        gap: 16,
        padding: '14px 4px',
        borderBottom: `1px solid ${GOLD_RULE}`,
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.64rem',
          letterSpacing: '0.22em',
          color: GOLD,
          fontWeight: 700,
        }}
      >
        {n}
      </span>
      <div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontStyle: 'italic',
            fontSize: '1.05rem',
            color: INK,
            lineHeight: 1.15,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: '0.82rem',
            color: MUTED,
            lineHeight: 1.4,
            marginTop: 2,
          }}
        >
          {detail}
        </div>
      </div>
      <kbd
        style={{
          padding: '6px 10px',
          borderRadius: 3,
          background: CREAM,
          border: `1px solid ${GOLD_RULE}`,
          fontFamily: FONT_MONO,
          fontSize: '0.66rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: INK,
          minWidth: 44,
          textAlign: 'center',
        }}
      >
        {shortcut}
      </kbd>
    </li>
  );
}
