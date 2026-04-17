'use client';

// ─────────────────────────────────────────────────────────────
// EditorialHero — v6 marketing hero.
// Big concrete promise (no poetry). Editorial display type.
// One CTA. Live mini-demo to the right.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditorialHeroProps {
  onGetStarted: () => void;
}

const ROTATING_NOUN = ['wedding', 'anniversary', 'memorial', 'birthday', 'reunion', 'milestone'];
const LONGEST_NOUN = ROTATING_NOUN.reduce((a, b) => (b.length > a.length ? b : a));

export function EditorialHero({ onGetStarted }: EditorialHeroProps) {
  const [nounIdx, setNounIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNounIdx((i) => (i + 1) % ROTATING_NOUN.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="pl-grain"
      style={{
        position: 'relative',
        minHeight: 'min(94vh, 880px)',
        background: 'var(--pl-gradient-hero)',
        padding: 'clamp(96px, 14vh, 160px) clamp(20px, 5vw, 64px) clamp(48px, 8vh, 96px)',
        overflow: 'hidden',
      }}
    >
      {/* Editorial edition mark — top corner */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 'clamp(20px, 5vw, 64px)',
          color: 'var(--pl-muted)',
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.66rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          display: 'flex',
          gap: 18,
          alignItems: 'center',
        }}
      >
        <span>Built for life&rsquo;s biggest days</span>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--pl-gold)' }} />
        <span>The Event OS</span>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
          gap: 'clamp(40px, 6vw, 96px)',
          alignItems: 'end',
        }}
        className="pl-hero-grid"
      >
        {/* ── Left: editorial promise ─────────────────────────── */}
        <div className="pl-rise">
          <div
            className="pl-overline pl-rise pl-rise-d1"
            style={{
              marginBottom: 28,
              display: 'inline-flex',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <span style={{ width: 18, height: 1, background: 'var(--pl-gold)' }} />
            The operating system for the days that matter
          </div>

          <h1
            className="pl-display pl-rise pl-rise-d2"
            style={{
              margin: 0,
              fontSize: 'clamp(2.6rem, 7.5vw, 5.4rem)',
              color: 'var(--pl-ink)',
              maxWidth: '15ch',
            }}
          >
            One calm command center for every{' '}
            <span style={{ position: 'relative', display: 'inline-block', verticalAlign: 'baseline' }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.em
                  key={ROTATING_NOUN[nounIdx]}
                  initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--pl-font-display)',
                    fontStyle: 'italic',
                    color: 'var(--pl-olive)',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  {ROTATING_NOUN[nounIdx]}.
                </motion.em>
              </AnimatePresence>
              {/* Sizes the inline slot to the longest word so the line never reflows. */}
              <span
                aria-hidden
                style={{
                  visibility: 'hidden',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--pl-font-display)',
                  fontStyle: 'italic',
                }}
              >
                {LONGEST_NOUN}.
              </span>
            </span>
          </h1>

          <p
            className="pl-rise pl-rise-d3"
            style={{
              margin: '32px 0 0',
              maxWidth: '46ch',
              fontFamily: 'var(--pl-font-body)',
              fontSize: 'clamp(1.04rem, 1.4vw, 1.18rem)',
              lineHeight: 1.55,
              color: 'var(--pl-ink-soft)',
            }}
          >
            Sites, guests, vendors, day-of, and the post-event film — woven into one workspace.
            AI-drafted, host-edited, guest-loved.
          </p>

          <div
            className="pl-rise pl-rise-d4"
            style={{
              marginTop: 40,
              display: 'flex',
              gap: 20,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={onGetStarted}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '18px 32px',
                background: 'var(--pl-ink)',
                color: 'var(--pl-cream)',
                border: '1px solid var(--pl-ink)',
                borderRadius: 'var(--pl-radius-full)',
                fontFamily: 'var(--pl-font-body)',
                fontSize: '0.96rem',
                fontWeight: 600,
                letterSpacing: '-0.005em',
                cursor: 'pointer',
                transition: 'transform var(--pl-dur-fast) var(--pl-ease-spring), box-shadow var(--pl-dur-base) var(--pl-ease-out)',
                boxShadow: 'var(--pl-shadow-md)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--pl-shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--pl-shadow-md)';
              }}
            >
              Start weaving — free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <a
              href="#editor"
              style={{
                color: 'var(--pl-ink-soft)',
                fontSize: '0.92rem',
                fontWeight: 500,
                textDecoration: 'underline',
                textUnderlineOffset: 5,
                textDecorationColor: 'var(--pl-gold)',
                textDecorationThickness: '1.5px',
              }}
            >
              See the 90-second tour
            </a>
          </div>

          {/* Trust line — editorial */}
          <div
            className="pl-rise pl-rise-d5"
            style={{
              marginTop: 38,
              paddingTop: 22,
              borderTop: '1px solid var(--pl-divider)',
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
              fontSize: '0.78rem',
              color: 'var(--pl-muted)',
              letterSpacing: '0.04em',
            }}
          >
            <span>· No credit card</span>
            <span>· Live in 5 minutes</span>
            <span>· Yours forever, even on the free tier</span>
          </div>
        </div>

        {/* ── Right: editorial product card ───────────────────── */}
        <div
          className="pl-rise pl-rise-d3"
          style={{
            position: 'relative',
            aspectRatio: '4 / 5',
            maxHeight: 640,
            justifySelf: 'end',
            width: '100%',
            maxWidth: 460,
          }}
        >
          {/* Frame */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'var(--pl-radius-2xl)',
              overflow: 'hidden',
              background: 'var(--pl-cream-card)',
              border: '1px solid var(--pl-divider)',
              boxShadow: 'var(--pl-shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Editorial caption header */}
            <div
              style={{
                padding: '14px 22px 10px',
                borderBottom: '1px solid var(--pl-divider-soft)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.62rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--pl-muted)',
              }}
            >
              <span>Plate I — Event HQ</span>
              <span style={{ display: 'inline-flex', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pl-plum)' }} />
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pl-gold)' }} />
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pl-olive)' }} />
              </span>
            </div>

            {/* The "screen" — fake mini-dashboard */}
            <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="pl-overline" style={{ fontSize: '0.6rem' }}>
                T-minus
              </div>
              <div
                style={{
                  fontFamily: 'var(--pl-font-display)',
                  fontWeight: 400,
                  fontSize: '4.2rem',
                  lineHeight: 0.86,
                  color: 'var(--pl-ink)',
                  letterSpacing: '-0.04em',
                  fontVariationSettings: '"opsz" 144, "SOFT" 50',
                }}
              >
                42
                <span
                  style={{
                    fontStyle: 'italic',
                    color: 'var(--pl-olive)',
                    fontSize: '1.4rem',
                    fontWeight: 500,
                    letterSpacing: 0,
                    marginLeft: 6,
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  days
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.94rem',
                  color: 'var(--pl-ink-soft)',
                  lineHeight: 1.45,
                }}
              >
                until <em style={{ color: 'var(--pl-olive)', fontFamily: 'var(--pl-font-display)', fontVariationSettings: '"opsz" 144, "WONK" 1' }}>Sarah &amp; Alex</em> at the Charleston Lookout
              </div>

              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <MiniRow icon="·" label="RSVPs in" value="64 / 92" trend="+3 today" />
                <MiniRow icon="✦" label="Pear suggests" value="Send a save-the-date nudge" trend="" />
                <MiniRow icon="◐" label="Vendor next step" value="Florist deposit due" trend="$580" />
              </div>
            </div>

            {/* Footer chip */}
            <div
              style={{
                padding: '12px 22px',
                background: 'var(--pl-cream-deep)',
                borderTop: '1px solid var(--pl-divider-soft)',
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.62rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--pl-olive)',
              }}
            >
              Live · woven by Pear at 4:12pm
            </div>
          </div>

          {/* Floating editorial annotation */}
          <div
            style={{
              position: 'absolute',
              bottom: -18,
              left: -28,
              padding: '10px 14px',
              background: 'var(--pl-ink)',
              color: 'var(--pl-cream)',
              borderRadius: 'var(--pl-radius-md)',
              fontFamily: 'var(--pl-font-display)',
              fontStyle: 'italic',
              fontSize: '0.82rem',
              fontWeight: 400,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              boxShadow: 'var(--pl-shadow-lg)',
              transform: 'rotate(-2deg)',
            }}
          >
            "Calm. Finally."
          </div>
        </div>
      </div>

      {/* Mobile stacking — using global query since this is a server-renderable section */}
      <style jsx>{`
        @media (max-width: 880px) {
          :global(.pl-hero-grid) {
            grid-template-columns: 1fr !important;
            gap: 56px !important;
          }
        }
      `}</style>
    </section>
  );
}

function MiniRow({ icon, label, value, trend }: { icon: string; label: string; value: string; trend?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '10px 12px',
        background: 'var(--pl-olive-mist)',
        borderRadius: 'var(--pl-radius-md)',
        fontSize: '0.84rem',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--pl-cream-card)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--pl-olive)',
          fontWeight: 700,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.66rem', color: 'var(--pl-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ color: 'var(--pl-ink)', fontWeight: 500 }}>{value}</div>
      </div>
      {trend && (
        <span style={{ color: 'var(--pl-olive)', fontWeight: 600, fontSize: '0.78rem' }}>{trend}</span>
      )}
    </div>
  );
}
