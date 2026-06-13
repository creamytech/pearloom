'use client';

// The promise slab — 4 tilted notes on a dark band, each one a
// second-person product promise anchored to a real, shipped
// feature (named in the attribution line). Deliberately NOT
// testimonials: the product is pre-launch and fabricated quotes
// with invented names undercut the trust the page is built to
// earn. When real love notes arrive, swap them in here.

import { Bloom, Swirl } from '@/components/brand/groove';
import { Ornament, Pearl, Pill, PD, DISPLAY_STYLE, pdInkMix } from './DesignAtoms';

const NOTES = [
  {
    t: 'The save-the-date opens like a letter, not a form — set in your two names, in your own colors, from your own photographs.',
    n: 'The suite',
    role: 'Save-the-dates · drafted by Pear',
    bg: PD.paper2,
    rot: -2,
  },
  {
    t: 'A memorial, drafted gently in their voice. You change four words, and it is ready for family. It will never cost anything.',
    n: 'Memorials',
    role: 'Free on every tier — written into the code',
    bg: PD.wash,
    rot: 1.5,
  },
  {
    t: 'On the day, everyone knows what is next. The run of show, the seating, the live photo wall — one quiet room, threading itself.',
    n: 'The day-of room',
    role: 'Timeline · toasts · broadcasts',
    bg: PD.blush,
    rot: -1,
  },
  {
    t: 'A year on, the site returns — rewoven with every photo, toast, and note your guests left behind. Yours to keep, always.',
    n: 'The rebroadcast',
    role: 'Anniversaries · the memory book',
    bg: PD.sand,
    rot: 2,
  },
];

export function DesignTestimonials() {
  return (
    <section
      style={{
        padding: 'clamp(56px, 12vw, 140px) clamp(20px, 5vw, 24px)',
        // Slab, not ink: in light mode this IS the ink (dark band on
        // cream); in dark mode it lifts slightly above the midnight
        // page paper instead of inverting to cream, so the section
        // stays a distinguishable dark slab.
        background: PD.slab,
        color: PD.slabInk,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient blobs + bloom + swirl */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -100,
          right: -120,
          width: 360,
          height: 360,
          background: PD.olive,
          borderRadius: '62% 38% 54% 46% / 49% 58% 42% 51%',
          opacity: 0.18,
          filter: 'blur(40px)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: 280,
          height: 280,
          background: PD.gold,
          borderRadius: '55% 45% 38% 62% / 38% 52% 48% 62%',
          opacity: 0.15,
          filter: 'blur(30px)',
        }}
      />
      <div className="pd-anim" style={{ position: 'absolute', top: 60, left: 40, opacity: 0.4 }} aria-hidden>
        <Bloom size={90} color={PD.butter} centerColor={PD.olive} speed={8} />
      </div>
      <div className="pd-anim" style={{ position: 'absolute', bottom: 80, right: 60, opacity: 0.3 }} aria-hidden>
        <Swirl size={90} color={PD.butter} strokeWidth={1.4} />
      </div>

      <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 72, maxWidth: 820, marginInline: 'auto' }}>
          <Pill color="transparent" ink={PD.slabInk} style={{ marginBottom: 18, borderColor: PD.slabInk }}>
            <Pearl size={7} /> THE PROMISE
          </Pill>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(40px, 5.5vw, 76px)',
              lineHeight: 0.95,
              margin: 0,
              fontWeight: 400,
              letterSpacing: '-0.025em',
              color: PD.slabInk,
            }}
          >
            Days that deserve keeping,
            <br />
            <span
              style={{
                fontStyle: 'italic',
                color: PD.butter,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              woven.
            </span>
          </h2>
        </div>

        <div
          className="pd-testimonials-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {NOTES.map((q) => (
            <div
              key={q.n}
              style={{
                background: q.bg,
                color: PD.ink,
                borderRadius: 20,
                padding: '32px 34px',
                transform: `rotate(${q.rot}deg)`,
                transition: 'transform var(--pl-dur-base) var(--pl-ease-out)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(0deg) translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `rotate(${q.rot}deg)`;
              }}
            >
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 44,
                  lineHeight: 0.4,
                  color: PD.gold,
                  fontStyle: 'italic',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                &ldquo;
              </div>
              <p
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 22,
                  lineHeight: 1.4,
                  margin: '8px 0 28px',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: PD.ink,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                {q.t}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingTop: 16,
                  borderTop: `1px solid ${pdInkMix(15)}`,
                }}
              >
                <Ornament size={14} color={PD.olive} />
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-body)',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {q.n}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-body)',
                      fontSize: 11.5,
                      opacity: 0.65,
                    }}
                  >
                    {q.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* (The fictional press strip that lived here — "The Paper",
            "Offsite", etc. — was removed: invented publications cost
            more trust than they buy. Real press goes here when it
            exists.) */}
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          :global(.pd-testimonials-grid) {
            grid-template-columns: 1fr !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.pd-anim),
          :global(.pd-anim *) {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
