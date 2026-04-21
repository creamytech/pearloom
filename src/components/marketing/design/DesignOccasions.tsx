'use client';

// Occasions Gallery — 12 occasion cards, each with its own
// hand-drawn SVG glyph and palette. Tilted on rest; straighten
// and lift on hover. Matches design bundle's templates.jsx.

import { type ReactNode } from 'react';
import { Pear, Pearl, Pill, PLButton, Leaf, PD, DISPLAY_STYLE, MONO_STYLE } from './DesignAtoms';

interface Occasion {
  title: string;
  tone: string;
  bg: string;
  fg: string;
  blocks: string;
  shape: ReactNode;
}

const OCCASIONS: Occasion[] = [
  {
    title: 'Weddings',
    tone: 'CEREMONIAL',
    bg: PD.sand,
    fg: PD.ink,
    blocks: '14',
    shape: <Pear size={80} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />,
  },
  {
    title: 'Memorials',
    tone: 'SOLEMN',
    bg: PD.wash,
    fg: PD.ink,
    blocks: '11',
    shape: (
      <svg width="70" height="70" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="28" fill="none" stroke={PD.plum} strokeWidth="1.5" />
        <circle cx="40" cy="40" r="18" fill="none" stroke={PD.plum} strokeWidth="1" />
        <circle cx="40" cy="40" r="6" fill={PD.plum} />
      </svg>
    ),
  },
  {
    title: 'Anniversaries',
    tone: 'INTIMATE',
    bg: PD.blush,
    fg: PD.ink,
    blocks: '9',
    shape: (
      <svg width="70" height="70" viewBox="0 0 80 80">
        <circle cx="30" cy="40" r="18" fill="none" stroke={PD.gold} strokeWidth="1.5" />
        <circle cx="50" cy="40" r="18" fill="none" stroke={PD.olive} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Milestone birthdays',
    tone: 'PLAYFUL',
    bg: PD.paper2,
    fg: PD.ink,
    blocks: '10',
    shape: (
      <svg width="70" height="70" viewBox="0 0 80 80">
        <g transform="translate(40 40)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <rect key={a} x="-2" y="-28" width="4" height="10" fill={PD.terra} transform={`rotate(${a})`} />
          ))}
          <circle r="10" fill={PD.terra} />
        </g>
      </svg>
    ),
  },
  {
    title: 'Bar & bat mitzvahs',
    tone: 'CEREMONIAL',
    bg: PD.mint,
    fg: PD.ink,
    blocks: '12',
    shape: (
      <svg width="70" height="70" viewBox="0 0 80 80">
        <path
          d="M40 10 L55 30 L50 60 L30 60 L25 30 Z"
          fill="none"
          stroke={PD.olive}
          strokeWidth="1.5"
        />
        <circle cx="40" cy="42" r="5" fill={PD.olive} />
      </svg>
    ),
  },
  {
    title: 'Baby showers',
    tone: 'TENDER',
    bg: PD.wash,
    fg: PD.ink,
    blocks: '9',
    shape: (
      <svg width="70" height="70" viewBox="0 0 80 80">
        <ellipse cx="40" cy="46" rx="22" ry="18" fill="none" stroke={PD.rose} strokeWidth="1.5" />
        <circle cx="40" cy="28" r="10" fill="none" stroke={PD.rose} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Reunions',
    tone: 'WARM',
    bg: PD.paper2,
    fg: PD.ink,
    blocks: '11',
    shape: (
      <svg width="70" height="70" viewBox="0 0 80 80">
        {[[20, 30], [40, 22], [60, 30], [28, 52], [52, 52]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="7" fill="none" stroke={PD.gold} strokeWidth="1.5" />
        ))}
      </svg>
    ),
  },
  {
    title: 'Engagement parties',
    tone: 'ROMANTIC',
    bg: PD.blush,
    fg: PD.ink,
    blocks: '8',
    shape: (
      <svg width="70" height="70" viewBox="0 0 80 80">
        <path
          d="M40 58 C 10 38, 20 12, 40 28 C 60 12, 70 38, 40 58 Z"
          fill="none"
          stroke={PD.terra}
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    title: 'Bachelor weekends',
    tone: 'LOOSE',
    bg: PD.mint,
    fg: PD.ink,
    blocks: '10',
    shape: (
      <svg width="70" height="70" viewBox="0 0 80 80">
        <path d="M20 50 L40 20 L60 50 Z" fill="none" stroke={PD.olive} strokeWidth="1.5" />
        <path d="M28 50 L40 32 L52 50 Z" fill="none" stroke={PD.olive} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Quinceañeras',
    tone: 'CEREMONIAL',
    bg: PD.wash,
    fg: PD.ink,
    blocks: '12',
    shape: (
      <svg width="70" height="70" viewBox="0 0 80 80">
        <g transform="translate(40 40)">
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse
              key={a}
              cx="0"
              cy="-18"
              rx="10"
              ry="16"
              fill="none"
              stroke={PD.rose}
              strokeWidth="1.3"
              transform={`rotate(${a})`}
            />
          ))}
          <circle r="6" fill={PD.rose} />
        </g>
      </svg>
    ),
  },
  {
    title: 'Retirements',
    tone: 'GRATEFUL',
    bg: PD.sand,
    fg: PD.ink,
    blocks: '9',
    shape: (
      <svg width="70" height="70" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="24" fill="none" stroke={PD.gold} strokeWidth="1.5" />
        <path d="M40 24 L40 40 L52 48" stroke={PD.gold} strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    title: 'Housewarmings',
    tone: 'WARM',
    bg: PD.blush,
    fg: PD.ink,
    blocks: '7',
    shape: (
      <svg width="70" height="70" viewBox="0 0 80 80">
        <path
          d="M20 52 L20 38 L40 20 L60 38 L60 52 Z"
          fill="none"
          stroke={PD.olive}
          strokeWidth="1.5"
        />
        <rect x="34" y="40" width="12" height="14" fill="none" stroke={PD.olive} strokeWidth="1.3" />
      </svg>
    ),
  },
];

const TILTS = [-2.2, 1.5, -1, 2, -2, 1, -1.5, 2.2, -2, 1, -1, 2];

interface DesignOccasionsProps {
  onGetStarted: () => void;
}

export function DesignOccasions({ onGetStarted }: DesignOccasionsProps) {
  return (
    <section
      id="occasions"
      style={{
        padding: '120px 24px',
        background: PD.paper3,
        borderTop: '1px solid rgba(31,36,24,0.1)',
        borderBottom: '1px solid rgba(31,36,24,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div
          className="pd-occasions-header"
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 24,
            marginBottom: 60,
          }}
        >
          <div style={{ maxWidth: 680 }}>
            <Pill style={{ marginBottom: 16 }}>
              <Leaf size={11} color={PD.olive} /> TWENTY-EIGHT OCCASIONS
            </Pill>
            <h2
              style={{
                ...DISPLAY_STYLE,
                fontSize: 'clamp(40px, 5.5vw, 76px)',
                lineHeight: 0.95,
                margin: 0,
                fontWeight: 400,
                letterSpacing: '-0.025em',
                color: PD.ink,
              }}
            >
              Each day has its{' '}
              <span
                style={{
                  fontStyle: 'italic',
                  color: PD.olive,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                own
              </span>
              <br />
              language. Pear speaks all of them.
            </h2>
          </div>
          <div
            style={{
              maxWidth: 380,
              fontSize: 15,
              color: PD.inkSoft,
              lineHeight: 1.55,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            An advice wall for the baby shower. A cost splitter for the reunion. A program and
            livestream for the memorial. A tribute wall, a toast signup, a packing list, the
            blocks you actually need, filtered by what you&rsquo;re actually hosting.
          </div>
        </div>

        <div
          className="pd-occasions-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 16,
          }}
        >
          {OCCASIONS.map((o, i) => (
            <OccasionCard key={o.title} o={o} rotate={TILTS[i]} />
          ))}
        </div>

        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <div style={{ ...MONO_STYLE, fontSize: 11, opacity: 0.6, marginBottom: 16 }}>
            — AND SIXTEEN MORE, QUIETLY WAITING —
          </div>
          <PLButton variant="ink" size="md" onClick={onGetStarted}>
            See every occasion →
          </PLButton>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1120px) {
          :global(.pd-occasions-grid) {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
        @media (max-width: 760px) {
          :global(.pd-occasions-grid) {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}

function OccasionCard({ o, rotate }: { o: Occasion; rotate: number }) {
  return (
    <div
      style={{
        background: o.bg,
        color: o.fg,
        border: '1px solid rgba(31,36,24,0.15)',
        borderRadius: 28,
        padding: 22,
        aspectRatio: '0.82',
        transform: `rotate(${rotate}deg)`,
        transition: 'transform 260ms cubic-bezier(.2,.8,.2,1), box-shadow 260ms',
        boxShadow: '0 1px 3px rgba(31,36,24,0.06)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'rotate(0deg) translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 18px 40px -16px rgba(31,36,24,0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = `rotate(${rotate}deg)`;
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(31,36,24,0.06)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.65 }}>{o.tone}</div>
        <Pearl size={7} />
      </div>
      <div style={{ alignSelf: 'center', opacity: 0.85 }}>{o.shape}</div>
      <div>
        <div
          style={{
            ...DISPLAY_STYLE,
            fontSize: 24,
            lineHeight: 1.05,
            fontStyle: 'italic',
            fontWeight: 400,
            letterSpacing: '-0.015em',
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          {o.title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            opacity: 0.72,
            marginTop: 4,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          {o.blocks} · tailored blocks
        </div>
      </div>
    </div>
  );
}
