'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/PearsPromise.tsx
//
// "Grief deserves no paywall." Short brand-critical moment
// declaring that memorials are always free, on every tier,
// with every block. Paired with a slow-spinning plum swirl
// wrapped around a heart glyph — the emotional atom of the
// promise without being saccharine.
// ─────────────────────────────────────────────────────────────

import { Sprout } from 'lucide-react';
import { BlurFade, Swirl, CurvedText } from '@/components/brand/groove';

export function PearsPromise() {
  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(72px, 10vh, 120px) clamp(20px, 5vw, 64px)',
        background: 'color-mix(in oklab, var(--pl-groove-plum) 6%, var(--pl-groove-cream))',
      }}
    >
      <div
        style={{
          maxWidth: 1040,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 'clamp(32px, 4vw, 56px)',
          alignItems: 'center',
        }}
        className="pl-pears-promise-grid"
      >
        <div>
          <BlurFade>
            <div
              aria-hidden
              style={{
                color: 'var(--pl-groove-plum)',
                marginBottom: 8,
                marginLeft: -6,
              }}
            >
              <CurvedText
                variant="arc"
                width={260}
                amplitude={14}
                fontFamily="var(--pl-font-body)"
                fontSize={14}
                fontWeight={500}
                letterSpacing={1.5}
                aria-label="Pear's promise"
              >
                ✦  Pear&rsquo;s promise  ✦
              </CurvedText>
            </div>
          </BlurFade>
          <BlurFade delay={0.08}>
            <h3
              style={{
                margin: '0 0 16px',
                fontFamily: 'var(--pl-font-body)',
                fontSize: 'clamp(2rem, 4.2vw, 3rem)',
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                color: 'var(--pl-groove-ink)',
              }}
            >
              Grief deserves{' '}
              <span
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'var(--pl-groove-plum)',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                no paywall.
              </span>
            </h3>
          </BlurFade>
          <BlurFade delay={0.16}>
            <p
              style={{
                margin: 0,
                maxWidth: '46ch',
                fontFamily: 'var(--pl-font-body)',
                fontSize: '1.04rem',
                lineHeight: 1.6,
                color: 'color-mix(in oklab, var(--pl-groove-ink) 72%, transparent)',
              }}
            >
              Memorials and funerals are free on every tier, always, with every
              block. Private gates, livestream, tribute wall, obituary. You
              don&rsquo;t sign up. You don&rsquo;t justify. You just host.
            </p>
          </BlurFade>
        </div>

        <BlurFade delay={0.16}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 240, height: 240 }}>
              <div
                className="pl-glyph-spin"
                style={{
                  position: 'absolute',
                  inset: 0,
                  animation: 'pl-spin-slow 50s linear infinite',
                }}
                aria-hidden
              >
                <Swirl size={240} color="var(--pl-groove-plum)" strokeWidth={1.4} />
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
                <Sprout size={72} stroke="var(--pl-groove-plum)" strokeWidth={1.6} />
              </div>
            </div>
          </div>
        </BlurFade>
      </div>

      <style jsx>{`
        @media (max-width: 720px) {
          .pl-pears-promise-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
}
