'use client';

import Link from 'next/link';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../design/DesignAtoms';

export function LandingPillars() {
  return (
    <section id="product" style={{ padding: '80px 40px 60px', background: PD.paper }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 11,
            color: '#6E5BA8',
            letterSpacing: '0.26em',
            marginBottom: 14,
          }}
        >
          DESIGNED FOR HOW YOU PLAN
        </div>
        <h2
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(28px, 3.4vw, 44px)',
            margin: '0 0 54px',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          Three pillars.{' '}
          <span style={{ fontStyle: 'italic', color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
            One seamless experience.
          </span>
        </h2>
      </div>

      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 32,
          position: 'relative',
        }}
        className="pl-pillars-grid"
      >
        {/* Connecting dotted thread */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 58,
            left: '16%',
            right: '16%',
            height: 1,
            background: `repeating-linear-gradient(to right, ${PD.olive} 0 4px, transparent 4px 10px)`,
            opacity: 0.3,
          }}
        />

        <Pillar
          accent="#C8B3D9"
          glyph={<FlowerGlyph />}
          title="Compose"
          kicker="PLAN WITH INTENTION"
          kickerColor="#6E5BA8"
          body="Bring your vision to life with beautiful sites, smart tools, and templates that reflect your story."
        />
        <Pillar
          accent="#F3D0BD"
          glyph={<CalendarGlyph />}
          title="Conduct"
          kicker="RUN WITH CONFIDENCE"
          kickerColor="#C47A4A"
          body="Coordinate tasks, timelines, and communications—so every detail is handled."
        />
        <Pillar
          accent="#D9E0C2"
          glyph={<Pear size={40} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />}
          title="Remember"
          kicker="KEEP FOREVER"
          kickerColor={PD.olive}
          body="Deliver albums, galleries, and keepsakes that help you hold on to what matters most."
        />
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          :global(.pl-pillars-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function Pillar({
  accent,
  glyph,
  title,
  kicker,
  kickerColor,
  body,
}: {
  accent: string;
  glyph: React.ReactNode;
  title: string;
  kicker: string;
  kickerColor: string;
  body: string;
}) {
  return (
    <div style={{ textAlign: 'left', position: 'relative', zIndex: 2 }}>
      <div
        style={{
          width: 116,
          height: 116,
          borderRadius: '50% 48% 52% 50% / 50% 52% 48% 50%',
          background: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 22,
          boxShadow: '0 4px 12px rgba(31,36,24,0.05)',
        }}
      >
        {glyph}
      </div>
      <h3
        style={{
          ...DISPLAY_STYLE,
          fontSize: 26,
          fontStyle: 'italic',
          fontWeight: 400,
          color: kickerColor,
          margin: '0 0 10px',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}
      >
        {title}
      </h3>
      <div
        style={{
          ...MONO_STYLE,
          fontSize: 10.5,
          color: kickerColor,
          letterSpacing: '0.22em',
          marginBottom: 10,
        }}
      >
        {kicker}
      </div>
      <p
        style={{
          fontSize: 14,
          color: PD.inkSoft,
          lineHeight: 1.6,
          margin: '0 0 14px',
          maxWidth: 260,
        }}
      >
        {body}
      </p>
      <Link
        href="/#product"
        style={{
          fontSize: 12.5,
          color: PD.ink,
          textDecoration: 'none',
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Learn more <span style={{ fontSize: 13 }}>→</span>
      </Link>
    </div>
  );
}

function FlowerGlyph() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="16" r="5" fill="#6E5BA8" />
      <circle cx="14" cy="22" r="4" fill="#8A76BD" />
      <circle cx="30" cy="22" r="4" fill="#8A76BD" />
      <circle cx="22" cy="26" r="3" fill="#6E5BA8" />
      <path d="M 22 28 L 22 40" stroke={PD.olive} strokeWidth="1.5" />
      <path d="M 22 34 Q 16 34, 14 30" stroke={PD.olive} strokeWidth="1.2" fill="none" />
    </svg>
  );
}

function CalendarGlyph() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="6" y="10" width="28" height="24" rx="4" stroke="#C47A4A" strokeWidth="1.5" fill="#FFFEF7" />
      <line x1="6" y1="16" x2="34" y2="16" stroke="#C47A4A" strokeWidth="1.5" />
      <circle cx="13" cy="22" r="1.5" fill="#C47A4A" />
      <circle cx="20" cy="22" r="1.5" fill="#C47A4A" />
      <circle cx="27" cy="22" r="1.5" fill="#C47A4A" />
      <circle cx="13" cy="28" r="1.5" fill="#C47A4A" />
      <path d="M 30 4 L 34 10" stroke="#C47A4A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
