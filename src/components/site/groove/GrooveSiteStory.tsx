'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/groove/GrooveSiteStory.tsx
//
// Story block for published sites in the groove family.
// Renders chapters as alternating BubbleCards with scroll-
// linked BlurFade entrances, sage/butter/rose wash tones
// cycling by chapter index, optional chapter image anchored
// to the opposite side.
//
// Editorial-family sites keep the canonical <StorySection>.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

interface Chapter {
  id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  date?: string;
  images?: Array<{ url?: string } | string>;
}

interface GrooveSiteStoryProps {
  chapters: Chapter[];
  accent: string;
  accent2?: string;
  foreground: string;
  background: string;
  muted?: string;
  headingFont: string;
  bodyFont: string;
}

// Cycle wash tones so consecutive chapters alternate their
// feel — sage / butter / rose / terra / plum. Repeats as
// needed for long stories.
const TONE_WASH_PERCENT = [
  'color-mix(in oklab, {accent} 12%, {bg})',
  'color-mix(in oklab, {accent} 20%, {bg})',
  'color-mix(in oklab, {accent} 8%, {bg})',
  'color-mix(in oklab, {accent} 16%, {bg})',
];

function useInView<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -80px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

function ChapterCard({
  chapter,
  index,
  accent,
  foreground,
  background,
  muted,
  headingFont,
  bodyFont,
}: {
  chapter: Chapter;
  index: number;
  accent: string;
  foreground: string;
  background: string;
  muted?: string;
  headingFont: string;
  bodyFont: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const flip = index % 2 === 1;
  const wash = TONE_WASH_PERCENT[index % TONE_WASH_PERCENT.length]
    .replace('{accent}', accent)
    .replace('{bg}', background);
  const imgUrl = (() => {
    const first = chapter.images?.[0];
    if (!first) return undefined;
    return typeof first === 'string' ? first : first.url;
  })();

  return (
    <article
      ref={ref}
      style={{
        display: 'grid',
        gridTemplateColumns: imgUrl ? 'minmax(0, 1.1fr) minmax(0, 0.9fr)' : '1fr',
        gap: 'clamp(20px, 4vw, 48px)',
        alignItems: 'center',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        filter: inView ? 'blur(0px)' : 'blur(6px)',
        transition:
          'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), ' +
          'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), ' +
          'filter 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Text card */}
      <div
        style={{
          padding: 'clamp(28px, 4vw, 48px)',
          background: wash,
          borderRadius: '32px',
          border: `1px solid color-mix(in oklab, ${accent} 18%, transparent)`,
          order: flip && imgUrl ? 2 : 1,
        }}
      >
        {chapter.date && (
          <div
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: accent,
              marginBottom: 16,
            }}
          >
            {formatDate(chapter.date)}
          </div>
        )}
        <h3
          style={{
            margin: 0,
            fontFamily: `"${headingFont}", Georgia, serif`,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(1.8rem, 3.6vw, 2.8rem)',
            lineHeight: 1.08,
            letterSpacing: '-0.015em',
            color: foreground,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          {chapter.title || 'Untitled'}
        </h3>
        {chapter.subtitle && (
          <p
            style={{
              margin: '12px 0 0',
              fontFamily: `"${headingFont}", Georgia, serif`,
              fontStyle: 'italic',
              fontSize: '1.1rem',
              color: muted ?? foreground,
              opacity: 0.82,
              lineHeight: 1.4,
            }}
          >
            {chapter.subtitle}
          </p>
        )}
        {chapter.description && (
          <p
            style={{
              margin: '20px 0 0',
              fontFamily: `"${bodyFont}", system-ui, sans-serif`,
              fontSize: '1rem',
              lineHeight: 1.65,
              color: foreground,
              opacity: 0.88,
            }}
          >
            {chapter.description}
          </p>
        )}
      </div>

      {/* Photo */}
      {imgUrl && (
        <div
          style={{
            position: 'relative',
            order: flip ? 1 : 2,
            aspectRatio: '4 / 5',
            borderRadius: index % 2 === 0
              ? '42% 58% 70% 30% / 45% 30% 70% 55%'
              : '62% 38% 43% 57% / 65% 55% 45% 35%',
            overflow: 'hidden',
            boxShadow: `0 18px 48px color-mix(in oklab, ${accent} 24%, transparent), 0 4px 12px rgba(43,30,20,0.12)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl}
            alt={chapter.title || ''}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}
    </article>
  );
}

export function GrooveSiteStory({
  chapters,
  accent,
  foreground,
  background,
  muted,
  headingFont,
  bodyFont,
}: GrooveSiteStoryProps) {
  if (!chapters?.length) return null;

  return (
    <section
      id="our-story"
      style={{
        padding: 'clamp(72px, 12vw, 140px) clamp(20px, 5vw, 64px)',
        background: `color-mix(in oklab, ${accent} 4%, ${background})`,
        position: 'relative',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(56px, 9vw, 96px)',
        }}
      >
        <header style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: accent,
              marginBottom: 18,
            }}
          >
            Our story
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: `"${headingFont}", Georgia, serif`,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: foreground,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            Chapters, woven.
          </h2>
        </header>

        {chapters.map((ch, i) => (
          <ChapterCard
            key={ch.id || i}
            chapter={ch}
            index={i}
            accent={accent}
            foreground={foreground}
            background={background}
            muted={muted}
            headingFont={headingFont}
            bodyFont={bodyFont}
          />
        ))}
      </div>
    </section>
  );
}

function formatDate(raw: string): string {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return raw;
  }
}
