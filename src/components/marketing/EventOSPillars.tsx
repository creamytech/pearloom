'use client';

// ─────────────────────────────────────────────────────────────
// EventOSPillars — Wave B section #2.
// Three pillars (Site · Day-of · Film) presented as editorial
// plates. This is the actual product story; the hero teases,
// this delivers. Each plate carries a numbered head, a verb,
// a one-sentence promise, and a real-feeling artifact.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

type Pillar = {
  num: string;
  verb: string;
  title: string;
  promise: string;
  bullets: string[];
  accent: 'olive' | 'gold' | 'plum';
};

const PILLARS: Pillar[] = [
  {
    num: '01',
    verb: 'Compose',
    title: 'The site',
    promise:
      'A magazine-grade event site, drafted by Pear and finished by you. Sections you can move, palettes you can swap, words that already sound like you.',
    bullets: ['Loom-drafted hero & story', 'Live cover-builder & moodboards', 'RSVP, registry, dietary, plus-ones'],
    accent: 'olive',
  },
  {
    num: '02',
    verb: 'Conduct',
    title: 'The day-of',
    promise:
      'Schedule, vendors, seating, voice updates, and a live guest stream. One control room — calm under pressure, beautiful in motion.',
    bullets: ['Run-of-show with handoff cues', 'Vendor portal & deposit tracker', 'Voice toasts → live stream'],
    accent: 'plum',
  },
  {
    num: '03',
    verb: 'Remember',
    title: 'The film',
    promise:
      'After the last guest leaves, Pear stitches photos, voice notes, and the day’s arc into a film you can keep, gift, and re-watch every year.',
    bullets: ['Auto-cut highlight reel', 'Anniversary nudges & rebroadcast', 'Printable keepsake archive'],
    accent: 'gold',
  },
];

export function EventOSPillars() {
  const [activeIdx, setActiveIdx] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) setActiveIdx(idx);
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="event-os"
      style={{
        position: 'relative',
        background: 'var(--pl-cream-deep)',
        padding: 'clamp(96px, 14vh, 160px) clamp(20px, 5vw, 64px)',
        borderTop: '1px solid var(--pl-divider)',
        borderBottom: '1px solid var(--pl-divider)',
      }}
    >
      {/* Section overline */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto 64px',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            className="pl-overline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 22,
            }}
          >
            <span style={{ width: 18, height: 1, background: 'var(--pl-gold)' }} />
            The Event Operating System
          </div>
          <h2
            className="pl-display"
            style={{
              margin: 0,
              fontSize: 'clamp(2rem, 5vw, 3.4rem)',
              color: 'var(--pl-ink)',
              maxWidth: '22ch',
              lineHeight: 1.05,
            }}
          >
            Three plates, one workspace. From{' '}
            <em
              style={{
                fontFamily: 'var(--pl-font-display)',
                fontStyle: 'italic',
                color: 'var(--pl-olive)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              "save the date"
            </em>{' '}
            to{' '}
            <em
              style={{
                fontFamily: 'var(--pl-font-display)',
                fontStyle: 'italic',
                color: 'var(--pl-gold)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              "remember when"
            </em>
            .
          </h2>
        </div>

        <div
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.66rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--pl-muted)',
            display: 'flex',
            gap: 18,
            alignItems: 'center',
            paddingTop: 8,
          }}
        >
          <span>§ {String(activeIdx + 1).padStart(2, '0')} / 03</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--pl-olive)' }} />
          <span>{PILLARS[activeIdx].verb}</span>
        </div>
      </div>

      {/* The three plates */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(80px, 12vh, 140px)',
        }}
      >
        {PILLARS.map((p, i) => (
          <Plate
            key={p.num}
            pillar={p}
            index={i}
            flip={i % 2 === 1}
            isActive={activeIdx === i}
            ref={(el: HTMLElement | null) => {
              refs.current[i] = el;
            }}
          />
        ))}
      </div>

      {/* Section closer */}
      <div
        style={{
          maxWidth: 1280,
          margin: 'clamp(96px, 14vh, 160px) auto 0',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          paddingTop: 36,
          borderTop: '1px solid var(--pl-divider)',
        }}
      >
        <p
          className="pl-display-italic"
          style={{
            margin: 0,
            fontSize: 'clamp(1.4rem, 2.5vw, 1.95rem)',
            color: 'var(--pl-ink)',
            maxWidth: '36ch',
            lineHeight: 1.25,
          }}
        >
          Most tools give you{' '}
          <span style={{ textDecoration: 'line-through', color: 'var(--pl-muted)' }}>
            a website.
          </span>{' '}
          Pearloom gives you the entire event.
        </p>
        <a
          href="#editor"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--pl-ink)',
            fontSize: '0.92rem',
            fontWeight: 600,
            textDecoration: 'underline',
            textUnderlineOffset: 5,
            textDecorationColor: 'var(--pl-gold)',
            textDecorationThickness: '1.5px',
          }}
        >
          See it in motion
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Plate — one pillar.
// ─────────────────────────────────────────────────────────────

const Plate = (() => {
  const PlateInner = (
    { pillar, index, flip, isActive, innerRef }: { pillar: Pillar; index: number; flip: boolean; isActive: boolean; innerRef?: (el: HTMLElement | null) => void }
  ) => {
    const accentVar =
      pillar.accent === 'olive'
        ? 'var(--pl-olive)'
        : pillar.accent === 'plum'
        ? 'var(--pl-plum)'
        : 'var(--pl-gold)';

    return (
      <article
        ref={innerRef}
        data-idx={index}
        className="pl-plate"
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)',
          gap: 'clamp(40px, 6vw, 96px)',
          alignItems: 'center',
        }}
      >
        {/* Ambient accent halo — brightens when the plate is the
            active (in-view) one, so as the reader scrolls, the
            right half of the page gently glows in the pillar's
            own colour. Purely decorative, no interaction. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            zIndex: 0,
            top: '50%',
            left: flip ? '18%' : '62%',
            width: 'min(58%, 680px)',
            height: 'min(72%, 620px)',
            transform: `translate(-50%, -50%) scale(${isActive ? 1 : 0.85})`,
            background: `radial-gradient(ellipse at center, color-mix(in oklab, ${accentVar} ${isActive ? '22%' : '9%'}, transparent) 0%, transparent 68%)`,
            filter: 'blur(12px)',
            pointerEvents: 'none',
            opacity: isActive ? 0.95 : 0.55,
            transition: 'opacity 720ms ease, transform 900ms cubic-bezier(0.22,1,0.36,1), background 720ms ease',
          }}
        />
        {/* Copy column */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            order: flip ? 2 : 1,
            paddingLeft: flip ? 0 : 'clamp(0px, 4vw, 56px)',
          }}
          className="pl-plate-copy"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 16,
              marginBottom: 18,
            }}
          >
            <span
              className="pl-display-italic"
              style={{
                fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
                color: accentVar,
                lineHeight: 1,
                fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 1',
                opacity: 0.55,
              }}
            >
              {pillar.num}
            </span>
            <span
              className="pl-overline"
              style={{ color: accentVar, fontSize: '0.7rem', letterSpacing: '0.22em' }}
            >
              {pillar.verb}
            </span>
          </div>

          <h3
            className="pl-display"
            style={{
              margin: '0 0 22px',
              fontSize: 'clamp(2rem, 4vw, 2.8rem)',
              color: 'var(--pl-ink)',
              lineHeight: 1.08,
            }}
          >
            {pillar.title}
          </h3>

          <p
            style={{
              margin: 0,
              maxWidth: '42ch',
              fontFamily: 'var(--pl-font-body)',
              fontSize: 'clamp(1rem, 1.3vw, 1.12rem)',
              lineHeight: 1.6,
              color: 'var(--pl-ink-soft)',
            }}
          >
            {pillar.promise}
          </p>

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '32px 0 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {pillar.bullets.map((b) => (
              <li
                key={b}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  fontSize: '0.94rem',
                  color: 'var(--pl-ink-soft)',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    flex: '0 0 auto',
                    width: 18,
                    height: 1,
                    background: accentVar,
                    marginTop: 11,
                  }}
                />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Artifact column */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            order: flip ? 1 : 2,
          }}
          className="pl-plate-artifact"
        >
          <PlateArtifact accent={pillar.accent} kind={pillar.title} />
        </div>

        <style jsx>{`
          @media (max-width: 880px) {
            article.pl-plate {
              grid-template-columns: 1fr !important;
              gap: 36px !important;
            }
            article.pl-plate :global(.pl-plate-copy),
            article.pl-plate :global(.pl-plate-artifact) {
              order: unset !important;
              padding-left: 0 !important;
            }
          }
        `}</style>
      </article>
    );
  };

  // wrap with forwardRef-equivalent via ref-as-prop API
  return function Plate({
    pillar,
    index,
    flip,
    isActive,
    ref,
  }: {
    pillar: Pillar;
    index: number;
    flip: boolean;
    isActive: boolean;
    ref?: (el: HTMLElement | null) => void;
  }) {
    return <PlateInner pillar={pillar} index={index} flip={flip} isActive={isActive} innerRef={ref} />;
  };
})();

// ─────────────────────────────────────────────────────────────
// Each plate gets its own visual artifact — not stock photos,
// but believable mini-product surfaces.
// ─────────────────────────────────────────────────────────────

function PlateArtifact({ accent, kind }: { accent: 'olive' | 'gold' | 'plum'; kind: string }) {
  const accentVar =
    accent === 'olive'
      ? 'var(--pl-olive)'
      : accent === 'plum'
      ? 'var(--pl-plum)'
      : 'var(--pl-gold)';

  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '5 / 4',
        borderRadius: 'var(--pl-radius-2xl)',
        overflow: 'hidden',
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        boxShadow: 'var(--pl-shadow-lg)',
      }}
    >
      {/* Strip accent */}
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accentVar,
          opacity: 0.85,
        }}
      />

      {/* Caption */}
      <div
        style={{
          padding: '16px 22px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--pl-muted)',
          borderBottom: '1px solid var(--pl-divider-soft)',
        }}
      >
        <span>{kind}</span>
        <span style={{ display: 'inline-flex', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pl-divider)' }} />
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pl-divider)' }} />
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentVar }} />
        </span>
      </div>

      <div style={{ padding: '24px 26px', height: 'calc(100% - 48px)', display: 'flex', flexDirection: 'column' }}>
        {kind === 'The site' && <SiteArtifact accent={accentVar} />}
        {kind === 'The day-of' && <DayOfArtifact accent={accentVar} />}
        {kind === 'The film' && <FilmArtifact accent={accentVar} />}
      </div>
    </div>
  );
}

function SiteArtifact({ accent }: { accent: string }) {
  return (
    <>
      <div className="pl-overline" style={{ fontSize: '0.6rem', marginBottom: 18 }}>
        Cover · Spring Edition
      </div>
      <div
        style={{
          fontFamily: 'var(--pl-font-display)',
          fontWeight: 400,
          fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
          lineHeight: 0.95,
          letterSpacing: '-0.025em',
          color: 'var(--pl-ink)',
          fontVariationSettings: '"opsz" 144, "SOFT" 60',
        }}
      >
        Sarah <em style={{ color: accent, fontStyle: 'italic', fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>&amp;</em> Alex
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: '0.86rem',
          color: 'var(--pl-ink-soft)',
        }}
      >
        October 18 · Charleston
      </div>

      <div
        style={{
          marginTop: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {['Story', 'Schedule', 'RSVP'].map((s) => (
          <div
            key={s}
            style={{
              padding: '12px 10px',
              background: 'var(--pl-olive-mist)',
              borderRadius: 'var(--pl-radius-md)',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: 'var(--pl-ink)',
              textAlign: 'center',
              letterSpacing: '0.04em',
            }}
          >
            {s}
          </div>
        ))}
      </div>
    </>
  );
}

function DayOfArtifact({ accent }: { accent: string }) {
  const ROWS = [
    { time: '14:00', label: 'Florals arrive', state: 'done' },
    { time: '15:30', label: 'First-look · East lawn', state: 'live' },
    { time: '17:00', label: 'Ceremony · seated', state: 'next' },
    { time: '19:30', label: 'Toasts & dinner', state: 'queued' },
  ];
  return (
    <>
      <div className="pl-overline" style={{ fontSize: '0.6rem', marginBottom: 14 }}>
        Run of show · Live
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ROWS.map((r) => (
          <div
            key={r.time}
            style={{
              display: 'grid',
              gridTemplateColumns: '54px 1fr auto',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              background:
                r.state === 'live'
                  ? 'var(--pl-olive-mist)'
                  : 'transparent',
              border: '1px solid',
              borderColor: r.state === 'live' ? accent : 'var(--pl-divider-soft)',
              borderRadius: 'var(--pl-radius-md)',
              fontSize: '0.84rem',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.74rem',
                color: 'var(--pl-muted)',
                letterSpacing: '0.06em',
              }}
            >
              {r.time}
            </span>
            <span
              style={{
                color: r.state === 'done' ? 'var(--pl-muted)' : 'var(--pl-ink)',
                textDecoration: r.state === 'done' ? 'line-through' : 'none',
                fontWeight: r.state === 'live' ? 600 : 400,
              }}
            >
              {r.label}
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                fontFamily: 'var(--pl-font-mono)',
                color:
                  r.state === 'live'
                    ? accent
                    : r.state === 'done'
                    ? 'var(--pl-muted)'
                    : 'var(--pl-ink-soft)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {r.state}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function FilmArtifact({ accent }: { accent: string }) {
  return (
    <>
      <div className="pl-overline" style={{ fontSize: '0.6rem', marginBottom: 14 }}>
        Highlight reel · Auto-cut
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 120,
          background:
            'linear-gradient(135deg, color-mix(in oklab, var(--pl-ink) 92%, transparent), color-mix(in oklab, var(--pl-plum) 80%, transparent))',
          borderRadius: 'var(--pl-radius-md)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--pl-cream)',
        }}
      >
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M6 4.5v11l10-5.5L6 4.5z" />
          </svg>
        </span>
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 12,
            right: 12,
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.62rem',
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          <span>03:42 / 04:15</span>
          <span>1080p</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          fontSize: '0.78rem',
          color: 'var(--pl-ink-soft)',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
        Anniversary nudge sent · year 1, year 5, year 10
      </div>
    </>
  );
}
