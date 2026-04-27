'use client';

// Testimonials — 4 tilted sticky notes on a dark slab with
// ambient blobs, bloom, and swirl. Hover straightens the note.
// Matches design bundle's testimonials.jsx.

import { Bloom, Swirl } from '@/components/brand/groove';
import { Ornament, Pearl, Pill, PD, DISPLAY_STYLE } from './DesignAtoms';

const QUOTES = [
  {
    t: "It was the first thing anyone sent me that didn't feel like a form. I kept it open on my phone all day.",
    n: 'Mira K.',
    role: 'Mira & Jun · September wedding',
    bg: PD.paper2,
    rot: -2,
  },
  {
    t: "Pear drafted the memorial in my mother's voice. I cried, then changed four words, and it was done.",
    n: 'The Osei family',
    role: 'For Amara · November',
    bg: PD.wash,
    rot: 1.5,
  },
  {
    t: 'The timeline alone saved my marriage. I knew what was next, she knew what was next, Pear just handled it.',
    n: 'Priya & Devon',
    role: 'Vow renewal · tenth anniversary',
    bg: PD.blush,
    rot: -1,
  },
  {
    t: "Everyone asked which studio we hired. No one believed a tool made it. I don't mind if it's our secret.",
    n: 'The Lark family',
    role: 'Maya at thirty',
    bg: PD.sand,
    rot: 2,
  },
];

export function DesignTestimonials() {
  return (
    <section
      style={{
        padding: '140px 24px',
        background: PD.ink,
        color: PD.paper,
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
      <div style={{ position: 'absolute', top: 60, left: 40, opacity: 0.4 }} aria-hidden>
        <Bloom size={90} color={PD.butter} centerColor={PD.olive} speed={8} />
      </div>
      <div style={{ position: 'absolute', bottom: 80, right: 60, opacity: 0.3 }} aria-hidden>
        <Swirl size={90} color={PD.butter} strokeWidth={1.4} />
      </div>

      <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 72, maxWidth: 820, marginInline: 'auto' }}>
          <Pill color="transparent" ink={PD.paper} style={{ marginBottom: 18, borderColor: PD.paper }}>
            <Pearl size={7} /> LOVE NOTES
          </Pill>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(40px, 5.5vw, 76px)',
              lineHeight: 0.95,
              margin: 0,
              fontWeight: 400,
              letterSpacing: '-0.025em',
              color: PD.paper,
            }}
          >
            Forty-two thousand days,
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
          {QUOTES.map((q) => (
            <div
              key={q.n}
              style={{
                background: q.bg,
                color: PD.ink,
                borderRadius: 20,
                padding: '32px 34px',
                transform: `rotate(${q.rot}deg)`,
                transition: 'transform 260ms',
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
                  borderTop: '1px solid rgba(31,36,24,0.15)',
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

        <div
          style={{
            marginTop: 72,
            display: 'flex',
            justifyContent: 'center',
            gap: 48,
            flexWrap: 'wrap',
            opacity: 0.55,
          }}
        >
          {['The Paper', 'Offsite', 'Nib & Ink', 'Gather', 'Dinner Party Co.'].map((x) => (
            <span
              key={x}
              style={{
                ...DISPLAY_STYLE,
                fontStyle: 'italic',
                fontSize: 22,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              {x}
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          :global(.pd-testimonials-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
