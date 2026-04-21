'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/OccasionOrbit.tsx
//
// "Twenty-eight occasions, one house" — two counter-rotating
// rings of occasion words drift around a central 3D pear. Hover
// a word and it pins to the center so the visitor can see
// exactly which occasions Pearloom covers.
//
// The rings counter-rotate on the same speed so the text stays
// upright while the ring moves. See /tmp/design-bundle marquee.jsx
// for the reference implementation.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { BlurFade, RipeningPear, Worm, CurvedText } from '@/components/brand/groove';

const INNER = ['Weddings', 'Memorials', 'Anniversaries', 'Birthdays', 'Bar mitzvahs', 'Baby showers', 'Reunions', 'Engagement parties'];
const OUTER = ['Bachelor weekends', 'Bridal showers', 'Quinceañeras', 'Vow renewals', 'Retirements', 'Graduations', 'Housewarmings', 'Baptisms', 'Rehearsals', 'Funerals'];

export function OccasionOrbit() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(96px, 14vh, 160px) clamp(20px, 5vw, 64px)',
        background: 'color-mix(in oklab, var(--pl-groove-butter) 10%, var(--pl-groove-cream))',
        borderTop: '1px solid color-mix(in oklab, var(--pl-groove-terra) 16%, transparent)',
        borderBottom: '1px solid color-mix(in oklab, var(--pl-groove-terra) 16%, transparent)',
        overflow: 'hidden',
      }}
    >
      {/* Decorative worms running across the top and bottom */}
      <div style={{ position: 'absolute', top: 24, left: 0, right: 0, opacity: 0.32, pointerEvents: 'none' }}>
        <Worm width={1600} height={24} color="var(--pl-groove-terra)" strokeWidth={1.4} segments={12} />
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, opacity: 0.32, transform: 'scaleX(-1)', pointerEvents: 'none' }}>
        <Worm width={1600} height={24} color="var(--pl-groove-sage)" strokeWidth={1.4} segments={14} />
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <BlurFade>
          <div
            aria-hidden
            style={{
              color: 'var(--pl-groove-terra)',
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <CurvedText
              variant="arc"
              width={360}
              amplitude={14}
              fontFamily="var(--pl-font-body)"
              fontSize={14}
              fontWeight={500}
              letterSpacing={1.6}
              aria-label="Twenty-eight occasions, one house"
            >
              ✦  Twenty-eight occasions, one house  ✦
            </CurvedText>
          </div>
        </BlurFade>
        <BlurFade delay={0.08}>
          <h2
            style={{
              margin: '0 0 clamp(56px, 9vh, 96px)',
              fontFamily: 'var(--pl-font-body)',
              fontSize: 'clamp(2rem, 4.8vw, 3.25rem)',
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: 'var(--pl-groove-ink)',
            }}
          >
            Whatever the day wants to be called,
            <br />
            <span
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--pl-groove-sage)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              Pear has a voice for it.
            </span>
          </h2>
        </BlurFade>

        {/* The orbit — two counter-rotating rings */}
        <BlurFade delay={0.16}>
          <div style={{ position: 'relative', width: 'min(520px, 92vw)', height: 'min(520px, 92vw)', margin: '0 auto' }}>
            {/* Outer ring */}
            <div
              className="pl-glyph-orbit"
              style={{ position: 'absolute', inset: 0, animation: 'pl-orbit-cw 90s linear infinite' }}
            >
              {OUTER.map((w, i) => {
                const a = (i / OUTER.length) * Math.PI * 2;
                const r = 230;
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
                      className="pl-glyph-orbit"
                      style={{
                        animation: 'pl-counter-cw 90s linear infinite',
                        display: 'inline-block',
                        cursor: 'default',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: '"Fraunces", Georgia, serif',
                          fontStyle: 'italic',
                          fontWeight: 400,
                          fontSize: 18,
                          color: isHovered ? 'var(--pl-groove-cream)' : 'var(--pl-groove-ink)',
                          background: isHovered ? 'var(--pl-groove-ink)' : 'transparent',
                          padding: isHovered ? '4px 12px' : 0,
                          borderRadius: 999,
                          transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out), padding var(--pl-dur-fast) var(--pl-ease-out)',
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
            <div
              className="pl-glyph-orbit"
              style={{ position: 'absolute', inset: 80, animation: 'pl-orbit-ccw 70s linear infinite' }}
            >
              {INNER.map((w, i) => {
                const a = (i / INNER.length) * Math.PI * 2;
                const r = 150;
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
                      className="pl-glyph-orbit"
                      style={{
                        animation: 'pl-counter-ccw 70s linear infinite',
                        display: 'inline-block',
                        cursor: 'default',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: '"Fraunces", Georgia, serif',
                          fontStyle: 'italic',
                          fontWeight: 400,
                          fontSize: 20,
                          color: isHovered ? 'var(--pl-groove-plum)' : 'var(--pl-groove-sage)',
                          transition: 'color var(--pl-dur-fast) var(--pl-ease-out)',
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

            {/* Dashed orbit guide rings */}
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 520 520"
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              preserveAspectRatio="xMidYMid meet"
            >
              <circle cx="260" cy="260" r="230" fill="none" stroke="var(--pl-groove-ink)" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 6" />
              <circle cx="260" cy="260" r="150" fill="none" stroke="var(--pl-groove-ink)" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 6" />
            </svg>

            {/* Center — pear + current label */}
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
                <div style={{ marginBottom: 14, display: 'inline-block' }}>
                  <RipeningPear size={90} scrollDriven={false} ripeness={0.7} />
                </div>
                <div
                  style={{
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 26,
                    fontWeight: 400,
                    minHeight: 36,
                    color: 'var(--pl-groove-ink)',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  {hovered || 'hover a word'}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-body)',
                    fontSize: '0.76rem',
                    fontWeight: 500,
                    color: 'color-mix(in oklab, var(--pl-groove-ink) 55%, transparent)',
                    marginTop: 6,
                    letterSpacing: '0.02em',
                  }}
                >
                  {hovered ? 'tailored blocks, per-voice writing' : 'or watch them drift'}
                </div>
              </div>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
