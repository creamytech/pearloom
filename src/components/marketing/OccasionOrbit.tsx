'use client';

// Faithful port of design bundle's marquee.jsx: two counter-
// rotating rings of occasions drift around a central 2D pear.
// Hover a word → pins to center. Exact sizing (520x520 stage,
// outer r=250, inner r=170), palette (#EADFC4 band, ink + olive
// text), typography (display italic), and copy.

import { useState } from 'react';
import { Worm } from '@/components/brand/groove';
import { Pear, Pill, PD, DISPLAY_STYLE, MONO_STYLE } from './design/DesignAtoms';

const INNER = ['Weddings', 'Memorials', 'Anniversaries', 'Birthdays', 'Bar mitzvahs', 'Baby showers', 'Reunions', 'Engagement parties'];
const OUTER = ['Bachelor weekends', 'Bridal showers', 'Quinceañeras', 'Vow renewals', 'Retirements', 'Graduations', 'Housewarmings', 'Baptisms', 'Rehearsals', 'Funerals'];

export function OccasionOrbit() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section
      style={{
        background: PD.paper2,
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid rgba(31,36,24,0.12)',
        borderBottom: '1px solid rgba(31,36,24,0.12)',
        padding: '120px 24px',
      }}
    >
      {/* Worms across top and bottom of the section */}
      <div style={{ position: 'absolute', top: 28, left: 0, right: 0, opacity: 0.35 }} aria-hidden>
        <Worm width={1600} height={24} color={PD.gold} strokeWidth={1.4} segments={12} />
      </div>
      <div
        style={{ position: 'absolute', bottom: 28, left: 0, right: 0, opacity: 0.35, transform: 'scaleX(-1)' }}
        aria-hidden
      >
        <Worm width={1600} height={24} color={PD.olive} strokeWidth={1.4} segments={14} />
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <div style={{ ...MONO_STYLE, fontSize: 11, opacity: 0.6, marginBottom: 16 }}>
          TWENTY-EIGHT OCCASIONS, ONE HOUSE
        </div>
        <h2
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(34px, 4vw, 58px)',
            lineHeight: 1,
            margin: '0 0 48px',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: PD.ink,
          }}
        >
          Whatever the day wants to be called,
          <br />
          <span
            style={{
              fontStyle: 'italic',
              color: PD.olive,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            Pear has a voice for it.
          </span>
        </h2>

        {/* The orbit */}
        <div
          style={{
            position: 'relative',
            width: 'min(520px, 92vw)',
            height: 'min(520px, 92vw)',
            margin: '0 auto',
          }}
        >
          {/* Outer ring */}
          <div style={{ position: 'absolute', inset: 0, animation: 'pl-orbit-cw 90s linear infinite' }}>
            {OUTER.map((w, i) => {
              const a = (i / OUTER.length) * Math.PI * 2;
              const r = 250;
              const x = Math.cos(a) * r;
              const y = Math.sin(a) * r;
              const isHovered = hovered === w;
              return (
                <div
                  key={w}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                  }}
                >
                  <div
                    onMouseEnter={() => setHovered(w)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      animation: 'pl-counter-cw 90s linear infinite',
                      display: 'inline-block',
                      cursor: 'default',
                    }}
                  >
                    <span
                      style={{
                        ...DISPLAY_STYLE,
                        fontSize: 20,
                        fontStyle: 'italic',
                        color: isHovered ? PD.paper : PD.ink,
                        background: isHovered ? PD.ink : 'transparent',
                        padding: isHovered ? '4px 10px' : 0,
                        borderRadius: 999,
                        transition: 'all 200ms',
                        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {w}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inner ring */}
          <div style={{ position: 'absolute', inset: 80, animation: 'pl-orbit-ccw 70s linear infinite' }}>
            {INNER.map((w, i) => {
              const a = (i / INNER.length) * Math.PI * 2;
              const r = 170;
              const x = Math.cos(a) * r;
              const y = Math.sin(a) * r;
              return (
                <div
                  key={w}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                  }}
                >
                  <div
                    onMouseEnter={() => setHovered(w)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      animation: 'pl-counter-ccw 70s linear infinite',
                      display: 'inline-block',
                      cursor: 'default',
                    }}
                  >
                    <span
                      style={{
                        ...DISPLAY_STYLE,
                        fontSize: 22,
                        color: PD.olive,
                        fontStyle: 'italic',
                        transition: 'all 200ms',
                        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {w}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dashed orbit guides */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 520 520"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            preserveAspectRatio="xMidYMid meet"
          >
            <circle cx="260" cy="260" r="250" fill="none" stroke="#1F2418" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 6" />
            <circle cx="260" cy="260" r="170" fill="none" stroke="#1F2418" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 6" />
          </svg>

          {/* Center — 2D pear + current label */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 10, display: 'inline-block' }}>
                <Pear size={80} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
              </div>
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 28,
                  fontStyle: 'italic',
                  minHeight: 40,
                  color: PD.ink,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                {hovered ?? 'hover a word'}
              </div>
              <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginTop: 4 }}>
                {hovered ? 'tailored blocks, per-voice writing' : 'or watch them drift'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Silence unused import warning */}
      <div aria-hidden style={{ display: 'none' }}>
        <Pill>X</Pill>
      </div>
    </section>
  );
}
