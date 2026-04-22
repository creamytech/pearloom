'use client';

import Image from 'next/image';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../design/DesignAtoms';
import { EDITOR, WIZARD, REMEMBER } from '@/lib/assets';
import { BrandImage } from './BrandImage';

// Real pear-with-flowers still used as the focal point of the
// hero composition.
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1400&q=80';

export function LandingHero({ onStart }: { onStart: () => void }) {
  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(24px, 4vw, 40px) clamp(20px, 4vw, 40px) clamp(40px, 6vw, 80px)',
        overflow: 'hidden',
        background: PD.paper,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
          gap: 48,
          alignItems: 'center',
          maxWidth: 1280,
          margin: '0 auto',
        }}
        className="pl-landing-hero-grid"
      >
        {/* Left — copy */}
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 11,
              color: '#6E5BA8',
              letterSpacing: '0.26em',
              marginBottom: 22,
            }}
          >
            AN EVENT OPERATING SYSTEM
          </div>
          <h1
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(56px, 7vw, 96px)',
              fontWeight: 400,
              letterSpacing: '-0.03em',
              lineHeight: 1.02,
              margin: '0 0 28px',
              color: PD.ink,
            }}
          >
            The days
            <br />
            that matter,
            <br />
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              woven
            </span>
            .
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: PD.inkSoft,
              maxWidth: 440,
              margin: '0 0 32px',
            }}
          >
            Plan with clarity. Invite with heart. Run with ease. Pearloom brings every thread
            of your event together—so you can be fully present for what matters most.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              marginBottom: 32,
            }}
          >
            <button
              onClick={onStart}
              style={{
                background: PD.oliveDeep,
                color: '#FFFEF7',
                border: 'none',
                borderRadius: 999,
                padding: '15px 26px',
                fontSize: 14.5,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 10px 26px rgba(76,90,38,0.28)',
              }}
            >
              Start planning your day
              <span style={{ fontSize: 16 }}>→</span>
            </button>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: PD.ink,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  border: '1.5px solid rgba(31,36,24,0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                }}
              >
                ▶
              </span>
              See how it works
            </button>
          </div>

          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AvatarStack />
            <div>
              <div style={{ fontSize: 13, color: PD.inkSoft, marginBottom: 3 }}>
                Loved by 10,000+ planners
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Stars />
                <span style={{ fontSize: 12.5, color: PD.inkSoft }}>4.9/5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — product composition */}
        <div
          className="pl-landing-hero-art"
          style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            maxWidth: 620,
            width: '100%',
            marginLeft: 'auto',
          }}
        >
          {/* Cream blob backdrop */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: '4% -6% 4% -6%',
              background: PD.paperCard,
              borderRadius: '62% 38% 52% 48% / 48% 54% 46% 52%',
              filter: 'blur(1px)',
            }}
          />

          {/* Circular badge top-right */}
          <CircularBadge />

          {/* Mock laptop frame with RSVP preview */}
          <div
            style={{
              position: 'absolute',
              top: '8%',
              left: '4%',
              width: '82%',
              background: '#FFFEF7',
              borderRadius: 18,
              boxShadow: '0 30px 60px rgba(31,36,24,0.14)',
              border: '1px solid rgba(31,36,24,0.06)',
              overflow: 'hidden',
            }}
          >
            <LaptopMockContent />
          </div>

          {/* Mock phone overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: '4%',
              left: '14%',
              width: '32%',
              aspectRatio: '9 / 19',
              background: '#FFFEF7',
              borderRadius: 28,
              boxShadow: '0 24px 60px rgba(31,36,24,0.22)',
              border: '2px solid rgba(31,36,24,0.1)',
              overflow: 'hidden',
            }}
          >
            <PhoneMockContent />
          </div>

          {/* Floating lavender cosmos top-left */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '-2%',
              left: '0%',
              width: 140,
              transform: 'rotate(-10deg)',
              pointerEvents: 'none',
            }}
          >
            <BrandImage
              src={WIZARD.flowerLavenderCosmos}
              alt=""
              style={{ width: '100%' }}
              fallback={<SmallFlowerSprig />}
            />
          </div>

          {/* Floating pear + thankyou still right */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              right: '-4%',
              bottom: '4%',
              width: '36%',
              filter: 'drop-shadow(0 16px 30px rgba(31,36,24,0.18))',
            }}
          >
            <BrandImage
              src={EDITOR.pearPhoto}
              alt=""
              style={{ width: '100%' }}
              fallback={
                <Image
                  src={HERO_IMAGE}
                  alt=""
                  width={220}
                  height={300}
                  style={{ objectFit: 'cover', borderRadius: '52% 48% 38% 62% / 38% 42% 58% 62%' }}
                />
              }
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pl-landing-hero-grid) {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          :global(.pl-landing-hero-art) {
            max-width: 440px !important;
            margin: 0 auto !important;
          }
        }
        @media (max-width: 600px) {
          :global(.pl-landing-hero-grid) {
            gap: 24px !important;
          }
          :global(.pl-landing-hero-art) {
            max-width: 340px !important;
          }
        }
      `}</style>
    </section>
  );
}

// ── Helpers ──────────────────────────────────────────────────
function AvatarStack() {
  const avatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=96&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&q=80',
  ];
  return (
    <div style={{ display: 'flex' }}>
      {avatars.map((src, i) => (
        <div
          key={i}
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            overflow: 'hidden',
            border: `2px solid ${PD.paper}`,
            marginLeft: i === 0 ? 0 : -10,
            position: 'relative',
          }}
        >
          <Image src={src} alt="" fill sizes="34px" style={{ objectFit: 'cover' }} />
        </div>
      ))}
    </div>
  );
}

function Stars() {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ color: PD.gold, fontSize: 12 }}>
          ★
        </span>
      ))}
    </div>
  );
}

function CircularBadge() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: '-2%',
        right: '0%',
        width: 120,
        height: 120,
        zIndex: 3,
      }}
    >
      <svg viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <path
            id="pl-hero-badge-arc"
            d="M 60 60 m -48 0 a 48 48 0 1 1 96 0 a 48 48 0 1 1 -96 0"
          />
        </defs>
        <text fontSize="9" fill={PD.ink} letterSpacing="2">
          <textPath href="#pl-hero-badge-arc" startOffset="0">
            THREADING PEOPLE · MOMENTS · MEMORIES ·
          </textPath>
        </text>
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 12,
          color: PD.gold,
        }}
      >
        ✦
      </div>
    </div>
  );
}

function SmallFlowerSprig() {
  return (
    <svg width="60" height="70" viewBox="0 0 60 70" fill="none">
      <path
        d="M 30 65 C 30 50, 32 35, 34 20"
        stroke={PD.olive}
        strokeWidth="1.2"
        fill="none"
      />
      <circle cx="34" cy="20" r="3" fill="#B89EBF" />
      <circle cx="26" cy="30" r="2.5" fill="#B89EBF" />
      <circle cx="38" cy="40" r="2" fill="#B89EBF" />
      <circle cx="22" cy="48" r="2" fill="#B89EBF" />
    </svg>
  );
}

function LaptopMockContent() {
  return (
    <div style={{ background: '#FFFEF7', padding: '16px 20px', fontFamily: 'var(--pl-font-body)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 12,
          borderBottom: '1px solid rgba(31,36,24,0.08)',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pear size={16} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
          <span style={{ fontSize: 11, fontWeight: 500 }}>Pearloom</span>
          <span style={{ fontSize: 9, color: PD.inkSoft, opacity: 0.7 }}>
            The Parker Wedding ▾
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 9, color: PD.inkSoft }}>
          <span style={{ color: PD.olive, borderBottom: `1.5px solid ${PD.olive}` }}>Compose</span>
          <span>Arrange</span>
          <span>Settings</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.3fr',
          gap: 14,
          fontSize: 10,
        }}
      >
        {/* Left nav */}
        <div style={{ fontSize: 9 }}>
          <div style={{ marginBottom: 8, color: PD.inkSoft, fontWeight: 500 }}>📅 June 14, 2025</div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 7,
              color: PD.inkSoft,
              opacity: 0.6,
              marginBottom: 6,
            }}
          >
            SITE OUTLINE
          </div>
          <div style={{ ...MONO_STYLE, fontSize: 7, color: PD.inkSoft, opacity: 0.5, marginTop: 12, marginBottom: 6 }}>
            ESSENTIALS
          </div>
          {['Our Story', 'The Details', 'RSVP', 'Registry'].map((l, i) => (
            <div
              key={l}
              style={{
                padding: '5px 8px',
                borderRadius: 6,
                background: i === 2 ? 'rgba(110,91,168,0.1)' : 'transparent',
                display: 'flex',
                justifyContent: 'space-between',
                color: PD.ink,
                fontSize: 9,
              }}
            >
              {l}
              <span style={{ color: PD.olive, fontSize: 8 }}>✓</span>
            </div>
          ))}
        </div>

        {/* Right preview */}
        <div
          style={{
            background: PD.paperCard,
            borderRadius: 10,
            padding: '16px 14px',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 7,
              opacity: 0.7,
              marginBottom: 10,
            }}
          >
            <span style={{ ...DISPLAY_STYLE, fontSize: 10, fontStyle: 'italic' }}>A &amp; J</span>
            <span style={{ display: 'flex', gap: 6 }}>
              <span>Our Story</span>
              <span>Details</span>
              <span style={{ color: PD.olive }}>RSVP</span>
            </span>
          </div>
          <h3
            style={{
              ...DISPLAY_STYLE,
              fontSize: 18,
              fontWeight: 400,
              margin: '4px 0 6px',
              letterSpacing: '-0.015em',
            }}
          >
            Kindly rsvp
          </h3>
          <p style={{ fontSize: 8, color: PD.inkSoft, margin: '0 0 10px', lineHeight: 1.5 }}>
            We can&rsquo;t wait to celebrate with you.
            <br />
            Please let us know by May 1st.
          </p>
          <div
            style={{
              background: '#FFFEF7',
              padding: 8,
              borderRadius: 8,
              fontSize: 7,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            <div>
              <div style={{ opacity: 0.6, marginBottom: 3 }}>Will you be joining us?</div>
              <div style={{ color: PD.olive, fontSize: 8 }}>● Yes, can&rsquo;t wait!</div>
            </div>
            <div>
              <div style={{ opacity: 0.6, marginBottom: 3 }}>Full name(s)</div>
              <div style={{ opacity: 0.5 }}>e.g. Alex &amp; Jamie</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneMockContent() {
  return (
    <div
      style={{
        background: PD.paperCard,
        height: '100%',
        padding: 12,
        fontFamily: 'var(--pl-font-body)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
        <span style={{ ...DISPLAY_STYLE, fontStyle: 'italic', fontSize: 10 }}>A &amp; J</span>
        <span style={{ opacity: 0.5 }}>☰</span>
      </div>
      <div style={{ flex: 1, ...DISPLAY_STYLE, fontSize: 15, fontStyle: 'italic', textAlign: 'center', padding: '12px 4px', lineHeight: 1.1 }}>
        We&rsquo;re getting married!
        <div style={{ fontSize: 8, fontStyle: 'normal', opacity: 0.6, marginTop: 6, fontFamily: 'var(--pl-font-body)' }}>
          June 14, 2025 · Napa, California
        </div>
      </div>
      <button
        style={{
          background: PD.olive,
          color: PD.paper,
          border: 'none',
          borderRadius: 999,
          padding: '6px',
          fontSize: 8,
          fontWeight: 500,
          fontFamily: 'inherit',
        }}
      >
        RSVP
      </button>
      <div
        style={{
          height: 60,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${PD.pear}, ${PD.olive})`,
          opacity: 0.6,
        }}
      />
    </div>
  );
}
