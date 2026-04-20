'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/GrooveEventOS.tsx
//
// Groove-brand "Event OS" section — the three product pillars
// (Compose / Conduct / Remember) told as a bento grid instead
// of editorial plates. Replaces EventOSPillars on the landing
// page.
//
// Layout on desktop:
//   ┌───────────────┬───────────┐
//   │ Compose (2×2) │ Conduct   │
//   │               ├───────────┤
//   │               │ Remember  │
//   └───────────────┴───────────┘
// Mobile collapses to a single column via GrooveBento's
// auto-responsive break.
// ─────────────────────────────────────────────────────────────

import { BlurFade, GrooveBento, type GrooveBentoCell } from '@/components/brand/groove';

const PILLAR_CELLS: GrooveBentoCell[] = [
  {
    id: 'compose',
    colSpan: 2,
    rowSpan: 2,
    tone: 'butter',
    eyebrow: '01 · Compose',
    title: (
      <>
        The site, <em style={{ fontStyle: 'italic', color: 'var(--pl-groove-terra)' }}>drafted</em>
      </>
    ),
    body: (
      <>
        A magazine-grade event site, drafted by Pear and finished by you.
        Sections you can move, palettes you can swap, words that already
        sound like you.
      </>
    ),
    decoration: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {['Loom-drafted hero & story', 'Live cover builder & moodboards', 'RSVP + registry + dietary + plus-ones'].map((line, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.9rem',
              color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--pl-groove-terra)',
                flexShrink: 0,
              }}
            />
            {line}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'conduct',
    tone: 'rose',
    eyebrow: '02 · Conduct',
    title: (
      <>
        The day-of, <em style={{ fontStyle: 'italic', color: 'var(--pl-groove-plum)' }}>choreographed</em>
      </>
    ),
    body: (
      <>
        Schedule, vendors, seating, voice updates, and a live guest stream.
        One control room.
      </>
    ),
  },
  {
    id: 'remember',
    tone: 'sage',
    eyebrow: '03 · Remember',
    title: (
      <>
        The film, <em style={{ fontStyle: 'italic', color: 'var(--pl-groove-sage)' }}>woven</em>
      </>
    ),
    body: (
      <>
        A recap film auto-cut from your day, plus an anniversary
        rebroadcast that mails itself to guests every year.
      </>
    ),
  },
];

interface GrooveEventOSProps {
  onGetStarted?: () => void;
}

export function GrooveEventOS({ onGetStarted }: GrooveEventOSProps) {
  return (
    <section
      id="event-os"
      style={{
        padding: 'clamp(80px, 12vh, 140px) clamp(20px, 5vw, 64px)',
        background:
          'linear-gradient(180deg, var(--pl-groove-cream) 0%, color-mix(in oklab, var(--pl-groove-butter) 8%, var(--pl-groove-cream)) 100%)',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <BlurFade>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--pl-groove-terra)',
              marginBottom: 14,
            }}
          >
            Event OS
          </div>
        </BlurFade>
        <BlurFade delay={0.08}>
          <h2
            className="pl-display"
            style={{
              margin: '0 0 16px',
              fontStyle: 'italic',
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
              lineHeight: 1.04,
              letterSpacing: '-0.015em',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              color: 'var(--pl-groove-ink)',
            }}
          >
            Three acts. One loom.
          </h2>
        </BlurFade>
        <BlurFade delay={0.16}>
          <p
            style={{
              margin: '0 0 48px',
              maxWidth: '52ch',
              fontSize: '1.04rem',
              lineHeight: 1.55,
              color: 'color-mix(in oklab, var(--pl-groove-ink) 74%, transparent)',
            }}
          >
            From first save-the-date to the anniversary recap, Pearloom
            carries the whole celebration on one thread. Compose, conduct,
            remember — it's the operating system for the days that matter.
          </p>
        </BlurFade>

        <GrooveBento cells={PILLAR_CELLS} columns={3} />
      </div>
    </section>
  );
}
