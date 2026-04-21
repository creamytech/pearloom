'use client';

// Pear's Promise + Giant CTA + Footer — matches the design
// bundle's footer.jsx. Three stacked sections:
//   1. Pear's promise (memorials always free) with heart
//      inside a slow-spinning plum swirl
//   2. Giant "Begin a thread" CTA with thread atoms above/below
//   3. Dark footer with 5-column nav + massive pearloom
//      wordmark at the bottom

import { Heart } from 'lucide-react';
import { Bloom, Swirl, ThreadStrand } from '@/components/brand/groove';
import { HeroPear, Pear, Pearl, Pill, PLButton, PD, DISPLAY_STYLE, MONO_STYLE } from './DesignAtoms';
import { Fragment } from 'react';

interface DesignCTAFooterProps {
  onGetStarted: () => void;
}

const FOOTER_COLS: Array<{ h: string; l: string[] }> = [
  { h: 'The product', l: ['The three acts', 'The Director', 'Occasions', 'Blocks', 'Changelog', 'Status'] },
  { h: 'Occasions', l: ['Weddings', 'Memorials', 'Anniversaries', 'Milestones', 'Showers'] },
  { h: 'The house', l: ['About', 'Manifesto', 'Careers', 'Press kit', 'Contact'] },
  { h: 'The small print', l: ['Help', 'Host playbook', 'Privacy', 'Terms', "Pear's promise"] },
];

export function DesignCTAFooter({ onGetStarted }: DesignCTAFooterProps) {
  return (
    <Fragment>
      {/* ── Pear's Promise ───────────────────────────────────── */}
      <section style={{ padding: '100px 24px 40px', position: 'relative', background: PD.paper }}>
        <div
          className="pd-promise-grid"
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 48,
            alignItems: 'center',
          }}
        >
          <div>
            <Pill style={{ marginBottom: 16 }}>
              <Heart size={11} fill={PD.terra} color={PD.terra} strokeWidth={0} /> PEAR&rsquo;S PROMISE
            </Pill>
            <h3
              style={{
                ...DISPLAY_STYLE,
                fontSize: 'clamp(30px, 3.6vw, 48px)',
                lineHeight: 1.05,
                margin: '0 0 16px',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: PD.ink,
              }}
            >
              Grief deserves{' '}
              <span
                style={{
                  fontStyle: 'italic',
                  color: PD.plum,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                no paywall.
              </span>
            </h3>
            <p
              style={{
                fontFamily: 'var(--pl-font-body)',
                fontSize: 16,
                lineHeight: 1.6,
                color: PD.inkSoft,
                margin: 0,
                maxWidth: 440,
              }}
            >
              Memorials and funerals are free on every tier, always, with every block. Private gates,
              livestream, tribute wall, obituary. You don&rsquo;t sign up. You don&rsquo;t justify.
              You just host.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 220, height: 220 }}>
              <div
                style={{ position: 'absolute', inset: 0, animation: 'pl-spin-slow 50s linear infinite' }}
                aria-hidden
              >
                <Swirl size={220} color={PD.plum} strokeWidth={1.4} />
              </div>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Heart size={64} fill={PD.plum} color={PD.plum} strokeWidth={0} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Giant CTA ───────────────────────────────────────── */}
      <section
        style={{ padding: '80px 24px 100px', position: 'relative', overflow: 'hidden', background: PD.paper }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 60,
            left: -160,
            width: 400,
            height: 400,
            background: PD.pear,
            borderRadius: '62% 38% 54% 46% / 49% 58% 42% 51%',
            opacity: 0.4,
            filter: 'blur(40px)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 0,
            right: -100,
            width: 300,
            height: 300,
            background: PD.butter,
            borderRadius: '55% 45% 38% 62% / 38% 52% 48% 62%',
            opacity: 0.35,
            filter: 'blur(30px)',
          }}
        />
        <div style={{ position: 'absolute', top: 60, right: '18%', opacity: 0.5 }} aria-hidden>
          <Bloom size={80} color={PD.butter} centerColor={PD.terra} speed={4} />
        </div>

        <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <ThreadStrand length={120} height={14} />
          </div>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(56px, 9vw, 140px)',
              lineHeight: 0.9,
              margin: '0 0 28px',
              fontWeight: 400,
              letterSpacing: '-0.03em',
              color: PD.ink,
            }}
          >
            Begin a{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              thread.
            </span>
          </h2>
          <p
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: 20,
              margin: '0 auto 40px',
              maxWidth: 580,
              color: PD.inkSoft,
              lineHeight: 1.5,
            }}
          >
            Three questions. A few photos. About eight minutes. Pear takes it from there, and stays
            with you until the last toast is set, like type.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <PLButton variant="ink" size="lg" onClick={onGetStarted}>
              Begin a thread <Pearl size={9} />
            </PLButton>
            <PLButton variant="ghost" size="lg">
              Read a real site ↗
            </PLButton>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <ThreadStrand length={120} height={14} />
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer
        style={{
          background: PD.ink,
          color: PD.paper,
          padding: '72px 24px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <div
            className="pd-footer-cols"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr',
              gap: 40,
              paddingBottom: 48,
              borderBottom: '1px solid rgba(244,236,216,0.14)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <Pear size={40} color={PD.pear} stem={PD.paper} leaf={PD.olive} />
                <span
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 32,
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Pearloom
                </span>
              </div>
              <p
                style={{
                  ...DISPLAY_STYLE,
                  fontStyle: 'italic',
                  fontSize: 14.5,
                  lineHeight: 1.55,
                  opacity: 0.7,
                  maxWidth: 320,
                  margin: 0,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                A craft house for memory. We weave the days that matter.
              </p>
              <p
                style={{
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: 13,
                  opacity: 0.55,
                  marginTop: 14,
                  maxWidth: 320,
                }}
              >
                Made with care in Lisbon and Brooklyn.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                {['✦', '◎', '◆', '❋'].map((x, i) => (
                  <a
                    key={i}
                    href="#"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      border: '1px solid rgba(244,236,216,0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      opacity: 0.75,
                      textDecoration: 'none',
                      color: PD.paper,
                      fontFamily: '"Fraunces", Georgia, serif',
                    }}
                  >
                    {x}
                  </a>
                ))}
              </div>
            </div>

            {FOOTER_COLS.map((col) => (
              <div key={col.h}>
                <div
                  style={{
                    ...MONO_STYLE,
                    fontSize: 10,
                    opacity: 0.5,
                    marginBottom: 16,
                  }}
                >
                  {col.h.toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.l.map((x) => (
                    <a
                      key={x}
                      href="#"
                      style={{
                        fontSize: 14,
                        opacity: 0.8,
                        textDecoration: 'none',
                        color: PD.paper,
                        fontFamily: 'var(--pl-font-body)',
                      }}
                    >
                      {x}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
              paddingTop: 28,
              fontSize: 12.5,
              opacity: 0.55,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            <div>© 2026 Pearloom, Inc. · Set, like type.</div>
            <div style={{ display: 'flex', gap: 18 }}>
              <a href="#" style={{ color: PD.paper, textDecoration: 'none' }}>Privacy</a>
              <a href="#" style={{ color: PD.paper, textDecoration: 'none' }}>Terms</a>
              <a href="#" style={{ color: PD.paper, textDecoration: 'none' }}>Cookies</a>
            </div>
          </div>

          {/* Massive pearloom wordmark */}
          <div
            aria-hidden
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(90px, 19vw, 280px)',
              lineHeight: 0.85,
              fontWeight: 400,
              marginTop: 40,
              whiteSpace: 'nowrap',
              textAlign: 'center',
              color: '#2C3022',
              letterSpacing: '-0.035em',
              userSelect: 'none',
              fontVariationSettings: '"SOFT" 60, "opsz" 144',
            }}
          >
            <span style={{ fontStyle: 'italic' }}>pearloom</span>
          </div>
        </div>
      </footer>

      {/* Use the hero pear here to prevent unused-import TS errors if
          present; safely no-op-rendered offscreen. */}
      <div aria-hidden style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <HeroPear size={1} />
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-promise-grid) {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          :global(.pd-footer-cols) {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </Fragment>
  );
}
