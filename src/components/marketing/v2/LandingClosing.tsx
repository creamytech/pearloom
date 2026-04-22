'use client';

import Image from 'next/image';
import { PD, DISPLAY_STYLE, Pear } from '../design/DesignAtoms';

const AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&q=80',
];

export function LandingClosing({ onStart }: { onStart: () => void }) {
  return (
    <section
      style={{
        padding: '60px 40px 80px',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          background: '#E8DFE9',
          borderRadius: 24,
          padding: 'clamp(28px, 3vw, 40px)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr)',
          gap: 28,
          alignItems: 'center',
        }}
        className="pl-closing-grid"
      >
        <div>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(24px, 2.6vw, 32px)',
              margin: 0,
              fontWeight: 400,
              letterSpacing: '-0.018em',
              lineHeight: 1.2,
              color: PD.ink,
            }}
          >
            Not just a planner.
            <br />
            A partner in{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: '#6E5BA8',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              your
            </span>{' '}
            stories.
          </h2>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 14,
          }}
        >
          <div style={{ fontSize: 13, color: PD.inkSoft }}>Join thousands who plan with purpose.</div>
          <button
            onClick={onStart}
            style={{
              background: PD.oliveDeep,
              color: '#FFFEF7',
              border: 'none',
              borderRadius: 999,
              padding: '13px 22px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 8px 20px rgba(76,90,38,0.22)',
            }}
          >
            Start planning your day <span style={{ fontSize: 15 }}>→</span>
          </button>
          <div style={{ display: 'flex' }}>
            {AVATARS.map((src, i) => (
              <div
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  overflow: 'hidden',
                  border: '2px solid #E8DFE9',
                  marginLeft: i === 0 ? 0 : -8,
                  position: 'relative',
                }}
              >
                <Image src={src} alt="" fill sizes="28px" style={{ objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              background: '#FFFEF7',
              borderRadius: 18,
              padding: '14px 16px',
              border: '1px solid rgba(31,36,24,0.06)',
              maxWidth: 200,
              position: 'relative',
            }}
          >
            <div
              style={{
                fontFamily: '"Caveat", "Fraunces", cursive',
                fontSize: 17,
                fontStyle: 'italic',
                color: PD.ink,
                lineHeight: 1.3,
              }}
            >
              Hi, I&rsquo;m Pear.
              <br />
              Here to help.
            </div>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                right: -6,
                bottom: 16,
                width: 14,
                height: 14,
                background: '#FFFEF7',
                borderRight: '1px solid rgba(31,36,24,0.06)',
                borderBottom: '1px solid rgba(31,36,24,0.06)',
                transform: 'rotate(-45deg)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -6,
                right: 14,
                fontSize: 10,
                color: '#B8935A',
              }}
            >
              ♡
            </div>
          </div>
          <Pear size={62} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 960px) {
          :global(.pl-closing-grid) {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
}
