'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/timeline-item.tsx
// Dynamic Multi-Layout Chapter Renderer — Ultra-Premium Editorial
// Layouts: editorial | fullbleed | split | cinematic | gallery | mosaic
// ─────────────────────────────────────────────────────────────

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { Transition, TargetAndTransition } from 'framer-motion';
import type { Chapter } from '@/types';
import { MoodDecorator } from '@/components/mood-decorator';
import { LocationPinIcon, PearlDividerIcon } from '@/components/icons/PearloomIcons';
import { VideoChapterPlayer } from '@/components/site/VideoChapterPlayer';
import { parseLocalDate } from '@/lib/date';

import { sanitizeSvg } from '@/lib/sanitize-svg';

interface TimelineItemProps {
  chapter: Chapter;
  index: number;
  chapterIcon?: string; // AI-generated SVG icon specific to this chapter
}

/**
 * Maps mood tag + emotional intensity to a Framer Motion entrance variant.
 * High-intensity dramatic moments snap in fast. Quiet intimate moments drift slowly.
 */
type MoodVariant = { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition };

function moodEntrance(mood: string, intensity = 5): MoodVariant {
  const m = (mood || '').toLowerCase();
  const dur = intensity >= 8 ? 0.65 : intensity >= 5 ? 0.9 : 1.2;

  // Night / moody / dark → pure opacity fade, no movement
  if (m.includes('night') || m.includes('dark') || m.includes('moody') || m.includes('midnight'))
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: dur * 1.3, ease: 'easeInOut' } };

  // High-intensity milestone → sharp rise from below, fast overshoot
  if (intensity >= 8)
    return { initial: { opacity: 0, y: 70 }, animate: { opacity: 1, y: 0 }, transition: { duration: dur, ease: [0.16, 1, 0.3, 1] } };

  // Dreamy / golden / warm → gentle diagonal drift
  if (m.includes('golden') || m.includes('sunset') || m.includes('warm') || m.includes('dreamy'))
    return { initial: { opacity: 0, y: 28, x: 12 }, animate: { opacity: 1, y: 0, x: 0 }, transition: { duration: dur, ease: [0.25, 1, 0.5, 1] } };

  // Adventure / mountain / travel → strong vertical rise
  if (m.includes('mountain') || m.includes('travel') || m.includes('adventure') || m.includes('outdoor'))
    return { initial: { opacity: 0, y: 60 }, animate: { opacity: 1, y: 0 }, transition: { duration: dur * 0.85, ease: [0.16, 1, 0.3, 1] } };

  // Cozy / lazy / intimate → slow, barely-moving float
  if (m.includes('cozy') || m.includes('lazy') || m.includes('sunday') || m.includes('intimate') || m.includes('winter'))
    return { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: dur * 1.4, ease: 'easeOut' } };

  // Playful / fun → light upward spring
  if (m.includes('playful') || m.includes('fun') || m.includes('summer'))
    return { initial: { opacity: 0, y: 40, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: dur, ease: [0.34, 1.56, 0.64, 1] } };

  // Default: standard fade-up
  return { initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 }, transition: { duration: dur, ease: [0.16, 1, 0.3, 1] } };
}

/** Applies chapter.styleOverrides to a base CSS style object */
function applyOverrides(chapter: Chapter, base: React.CSSProperties = {}): React.CSSProperties {
  const ov = chapter.styleOverrides;
  if (!ov) return base;
  const paddingMap = { compact: '2rem', normal: '4rem', spacious: '8rem' };
  return {
    ...base,
    ...(ov.backgroundColor ? { background: ov.backgroundColor } : {}),
    ...(ov.padding ? { paddingTop: paddingMap[ov.padding], paddingBottom: paddingMap[ov.padding] } : {}),
  };
}

/** Returns CSS object-position from AI-detected focal point, or 'center' as default */
function focalPos(chapter: Chapter): string {
  if (!chapter.imagePosition) return 'center';
  return `${chapter.imagePosition.x}% ${chapter.imagePosition.y}%`;
}

/** Returns the hero image URL — AI picks the best photo, falls back to index 0 */
function heroImage(chapter: Chapter): string {
  const imgs = chapter.images || [];
  if (!imgs.length) return '';
  const idx = chapter.heroPhotoIndex ?? 0;
  return imgs[Math.min(idx, imgs.length - 1)]?.url || '';
}

function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return '';
  if (rawUrl.includes('googleusercontent.com')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

function formatDate(dateStr: string): string {
  try {
    return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function formatDateFull(dateStr: string): string {
  try {
    const d = parseLocalDate(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch { return dateStr; }
}

// Ghost chapter number for editorial depth
function ChapterGhost({ number }: { number: number }) {
  const str = String(number).padStart(2, '0');
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        fontFamily: 'var(--pl-font-heading)',
        fontSize: 'clamp(7rem, 14vw, 12rem)',
        fontWeight: 700,
        color: 'var(--pl-gold)',
        opacity: 0.12,
        lineHeight: 1,
        letterSpacing: '-0.05em',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
        top: '-0.5rem',
        left: '-0.5rem',
      }}
    >
      {str}
    </div>
  );
}

// Mood pill — plum theme, springs in on scroll
function MoodBadge({ mood, light = false }: { mood?: string; light?: boolean }) {
  if (!mood) return null;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.72 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      style={{
        display: 'inline-block',
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontVariant: 'small-caps',
        padding: '0.28rem 0.8rem',
        borderRadius: '100px',
        background: light ? 'rgba(0,0,0,0.07)' : 'var(--pl-plum-mist)',
        color: light ? 'var(--pl-ink)' : 'var(--pl-plum)',
        border: light ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(109,89,122,0.15)',
        backdropFilter: light ? 'blur(8px)' : 'none',
        marginBottom: '1.1rem',
      }}
    >
      {mood}
    </motion.span>
  );
}

// Location pill with icon
function LocationPill({ label, light = false }: { label: string; light?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.3rem 0.8rem',
      borderRadius: '100px',
      background: light ? 'rgba(43,30,20,0.05)' : 'rgba(163,177,138,0.1)',
      border: light ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(163,177,138,0.2)',
      color: light ? 'var(--pl-ink-soft)' : 'var(--pl-muted)',
      fontSize: '0.65rem',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    }}>
      <LocationPinIcon size={10} color={light ? 'var(--pl-ink-soft)' : 'var(--pl-olive)'} />
      <span>{label}</span>
    </div>
  );
}

// Chapter divider with pearl icon — springs in on scroll
function ChapterDivider() {
  return (
    <motion.div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem 0',
      }}
      initial={{ opacity: 0, scale: 0.4 }}
      whileInView={{ opacity: 0.35, scale: 1 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
    >
      <PearlDividerIcon size={12} color="var(--pl-olive)" />
    </motion.div>
  );
}

// Emotional peak pre-chapter marker — shown above the climax chapter (proposal, wedding day, etc.)
function EmotionalPeakMarker() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '2rem 0 0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 0.5 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '40px', height: '1px', background: 'var(--pl-gold)', transformOrigin: 'right' }}
        />
        <motion.span
          initial={{ opacity: 0, scale: 0.4 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.35 }}
          style={{ fontSize: '1.1rem', color: 'var(--pl-gold)', letterSpacing: '0.2em' }}
        >✦ ✦ ✦</motion.span>
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 0.5 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '40px', height: '1px', background: 'var(--pl-gold)', transformOrigin: 'left' }}
        />
      </div>
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 0.75, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.55, duration: 0.5, ease: 'easeOut' }}
        style={{
        fontSize: '0.58rem',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        fontVariant: 'small-caps',
        color: 'var(--pl-gold)',
        fontWeight: 700,
      }}>
        A defining moment
      </motion.span>
    </div>
  );
}

// Collapsible video panel — "▶ Watch the moment" toggle
function CollapsibleVideo({ videoUrl }: { videoUrl: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'none',
          border: '1px solid var(--pl-olive)',
          borderRadius: '100px',
          padding: '0.35rem 0.9rem',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--pl-olive)',
          cursor: 'pointer',
          transition: 'background 0.18s',
        }}
        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--pl-olive), 0.08)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
      >
        <span aria-hidden="true">{open ? '▼' : '▶'}</span>
        {open ? 'Hide video' : 'Watch the moment'}
      </button>
      {open && (
        <div style={{ marginTop: '1rem' }}>
          <VideoChapterPlayer videoUrl={videoUrl} />
        </div>
      )}
    </div>
  );
}

// Photo with hover effect
function ChapterPhoto({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) {
  return (
    <div style={{ overflow: 'hidden', borderRadius: '6px', ...style }}>
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.4s ease',
        }}
        onMouseOver={e => {
          const img = e.currentTarget as HTMLImageElement;
          img.style.transform = 'scale(1.03)';
          img.style.filter = 'brightness(1.05)';
        }}
        onMouseOut={e => {
          const img = e.currentTarget as HTMLImageElement;
          img.style.transform = 'scale(1)';
          img.style.filter = 'none';
        }}
      />
    </div>
  );
}

// Pull-quote first sentence enhancement
function EnhancedDescription({ text, light = false }: { text: string; light?: boolean }) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const first = sentences[0] ?? '';
  const rest = sentences.slice(1).join(' ');
  const mutedColor = light ? 'var(--pl-ink)' : 'var(--pl-muted)';

  return (
    <div>
      {first && (
        <p style={{
          fontFamily: 'var(--pl-font-body)',
          fontSize: '1.15rem',
          fontWeight: 500,
          lineHeight: 1.75,
          color: light ? 'var(--pl-ink)' : 'var(--pl-ink)',
          margin: '0 0 0.75rem 0',
          maxWidth: '600px',
        }}>
          {first}
        </p>
      )}
      {rest && (
        <p style={{
          fontFamily: 'var(--pl-font-body)',
          fontSize: '1.05rem',
          fontWeight: 300,
          lineHeight: 1.85,
          color: mutedColor,
          margin: 0,
          maxWidth: '600px',
        }}>
          {rest}
        </p>
      )}
    </div>
  );
}

// ─── LAYOUT: EDITORIAL (magazine split — text 40%, photos 60%) ───
function EditorialLayout({ chapter, index }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isEven = index % 2 === 0;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['0 1.2', '1 0.8'] });
  const imgY1 = useTransform(scrollYProgress, [0, 1], ['12%', '-12%']);
  const imgY2 = useTransform(scrollYProgress, [0, 1], ['-8%', '18%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['8%', '-4%']);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const mainImage = heroImage(chapter);
  const secondImage = chapter.images[1]?.url || '';

  // ── Mobile layout — proper single-column stack ────────────────
  if (isMobile) {
    return (
      <>
        <ChapterDivider />
        <motion.article
          style={{ padding: '2rem 1.25rem 2.5rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Cover image — full width, 4:3 */}
          {mainImage && (
            <div style={{ borderRadius: '20px', overflow: 'hidden', aspectRatio: '4/3', marginBottom: '1.5rem', position: 'relative' }}>
              <img
                src={proxyUrl(mainImage, 900, 675)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Second image tucked corner */}
              {secondImage && (
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.28)', border: '2px solid var(--pl-ink-soft)' }}>
                  <img src={proxyUrl(secondImage, 160, 160)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              )}
            </div>
          )}

          {/* Text */}
          <div>
            <MoodBadge mood={chapter.mood} />
            <div style={{ marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--pl-olive)', fontWeight: 700 }}>
                {formatDateFull(chapter.date)}
              </span>
            </div>
            <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '1.85rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--pl-ink)', lineHeight: 1.1, margin: '0 0 0.6rem', letterSpacing: '-0.02em' }}>
              <span data-pe-editable="true" data-pe-field="title">{chapter.title}</span>
            </h3>
            {chapter.subtitle && (
              <p style={{ fontStyle: 'italic', color: 'var(--pl-muted)', fontSize: '1rem', marginBottom: '1rem', fontFamily: 'var(--pl-font-heading)', fontWeight: 300 }}>
                <span data-pe-editable="true" data-pe-field="subtitle">{chapter.subtitle}</span>
              </p>
            )}
            <div style={{ marginBottom: '1.25rem' }}>
              <MoodDecorator mood={chapter.mood} location={chapter.location?.label} light={false} />
            </div>
            <div data-pe-editable="true" data-pe-field="description">
              <EnhancedDescription text={chapter.description} />
            </div>
            {chapter.location && (
              <div style={{ marginTop: '1.5rem' }}>
                <LocationPill label={chapter.location.label} />
              </div>
            )}
          </div>
        </motion.article>
      </>
    );
  }

  return (
    <>
      <ChapterDivider />
      <motion.article
        ref={ref}
        style={applyOverrides(chapter, {
          display: 'flex',
          flexDirection: isEven ? 'row' : 'row-reverse',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6rem',
          padding: '5rem 4rem',
          maxWidth: '1300px',
          margin: '0 auto',
          width: '100%',
          position: 'relative',
        })}
        className="max-md:flex-col max-md:gap-8 max-md:px-6"
        {...moodEntrance(chapter.mood, chapter.emotionalIntensity)}
        whileInView={moodEntrance(chapter.mood, chapter.emotionalIntensity).animate}
        initial={moodEntrance(chapter.mood, chapter.emotionalIntensity).initial}
        viewport={{ once: true, margin: '-100px' }}
        transition={moodEntrance(chapter.mood, chapter.emotionalIntensity).transition}
      >
        {/* Editorial Image Stack — 60% */}
        <div style={{ flex: '0 0 56%', position: 'relative', minHeight: '600px' }} className="max-md:w-full max-md:min-h-[360px]">
          {mainImage && (
            <motion.div
              style={{
                position: 'absolute',
                width: secondImage ? '78%' : '100%',
                aspectRatio: '3/4',
                borderRadius: '6px',
                overflow: 'hidden',
                zIndex: 2,
                y: imgY1,
                left: isEven ? 0 : 'auto',
                right: isEven ? 'auto' : 0,
                boxShadow: '0 40px 80px rgba(0,0,0,0.13), 0 10px 20px rgba(43,30,20,0.05)',
              }}
            >
              <img
                src={proxyUrl(mainImage, 1200, 1600)}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.4s ease', display: 'block', background: 'var(--pl-olive-mist, #e8e4dc)' }}
                onMouseOver={e => { const img = e.currentTarget as HTMLImageElement; img.style.transform = 'scale(1.03)'; img.style.filter = 'brightness(1.05)'; }}
                onMouseOut={e => { const img = e.currentTarget as HTMLImageElement; img.style.transform = 'scale(1)'; img.style.filter = 'none'; }}
              />
            </motion.div>
          )}
          {secondImage && (
            <motion.div
              style={{
                position: 'absolute',
                width: '55%',
                aspectRatio: '4/5',
                borderRadius: '6px',
                overflow: 'hidden',
                zIndex: 1,
                y: imgY2,
                right: isEven ? 0 : 'auto',
                left: isEven ? 'auto' : 0,
                top: '14%',
                boxShadow: '0 24px 48px rgba(0,0,0,0.1)',
                filter: 'grayscale(18%) brightness(0.97)',
              }}
            >
              <img
                src={proxyUrl(secondImage, 800, 1000)}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.4s ease', display: 'block', background: 'var(--pl-olive-mist, #e8e4dc)' }}
                onMouseOver={e => { const img = e.currentTarget as HTMLImageElement; img.style.transform = 'scale(1.03)'; img.style.filter = 'brightness(1.05) grayscale(0)'; }}
                onMouseOut={e => { const img = e.currentTarget as HTMLImageElement; img.style.transform = 'scale(1)'; img.style.filter = 'grayscale(18%) brightness(0.97)'; }}
              />
            </motion.div>
          )}
        </div>

        {/* Video (editorial) — below images */}
        {chapter.videoUrl && (
          <div style={{ position: 'absolute', bottom: 0, left: isEven ? 0 : 'auto', right: isEven ? 'auto' : 0, width: '56%', zIndex: 20 }} className="max-md:static max-md:w-full max-md:mt-4">
            <CollapsibleVideo videoUrl={chapter.videoUrl} />
          </div>
        )}

        {/* Typography Column — 40% */}
        <motion.div style={{ flex: 1, textAlign: isEven ? 'left' : 'right', y: textY, position: 'relative', zIndex: 10 }} className="max-md:text-center">
          {/* Ghost chapter number */}
          <div style={{ position: 'relative' }}>
            <ChapterGhost number={index + 1} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <MoodBadge mood={chapter.mood} />
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--pl-olive)', fontWeight: 700 }}>
                  {formatDateFull(chapter.date)}
                </span>
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  whileInView={{ scaleX: 1, opacity: 0.2 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  style={{ width: '100%', height: '1px', background: 'var(--pl-olive)', marginTop: '0.5rem', transformOrigin: 'left' }}
                />
              </div>
              <h3 style={{
                fontFamily: 'var(--pl-font-heading)',
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 600,
                fontStyle: 'italic',
                color: chapter.styleOverrides?.textColor || 'var(--pl-ink)',
                lineHeight: 1.05,
                margin: '0 0 1rem 0',
                letterSpacing: '-0.03em',
              }}>
                <span data-pe-editable="true" data-pe-field="title">{chapter.title}</span>
              </h3>
              {chapter.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 10, skewY: -2 }}
                  whileInView={{ opacity: 1, y: 0, skewY: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
                  style={{ fontStyle: 'italic', color: 'var(--pl-muted)', fontSize: '1.1rem', marginBottom: '1.5rem', fontFamily: 'var(--pl-font-heading)', fontWeight: 300 }}
                >
                  <span data-pe-editable="true" data-pe-field="subtitle">{chapter.subtitle}</span>
                </motion.p>
              )}
              <div style={{ marginBottom: '1.5rem', textAlign: isEven ? 'left' : 'right' }}>
                <MoodDecorator mood={chapter.mood} location={chapter.location?.label} light={false} />
              </div>
              <div style={{ maxWidth: '480px', margin: isEven ? '0' : '0 0 0 auto' }} className="max-md:mx-auto" data-pe-editable="true" data-pe-field="description">
                <EnhancedDescription text={chapter.description} />
              </div>
              {chapter.location && (
                <div style={{ marginTop: '2.5rem', justifyContent: isEven ? 'flex-start' : 'flex-end', display: 'flex' }} className="max-md:justify-center">
                  <LocationPill label={chapter.location.label} />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.article>
    </>
  );
}

// ─── LAYOUT: FULLBLEED (cinematic 100vh with dramatic overlay) ───
function FullbleedLayout({ chapter }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-18%', '18%']);
  // Desaturate image as it exits viewport — reinforces narrative time progression
  const imgFilter = useTransform(
    scrollYProgress,
    [0, 0.55, 1],
    [
      'brightness(0.68) contrast(1.08) saturate(1.1)',
      'brightness(0.68) contrast(1.08) saturate(1.1)',
      'brightness(0.68) contrast(1.08) saturate(0.35)',
    ],
  );
  const hasImages = (chapter.images?.length ?? 0) > 0;
  const mainImage = heroImage(chapter);
  const [videoPlaying, setVideoPlaying] = useState(false);

  if (!hasImages) return <EditorialLayout chapter={chapter} index={0} />;

  return (
    <motion.article
      ref={ref}
      style={{ position: 'relative', height: '100dvh', minHeight: '600px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', ...(chapter.styleOverrides?.backgroundColor ? { background: chapter.styleOverrides.backgroundColor } : {}) }}
      {...moodEntrance(chapter.mood, chapter.emotionalIntensity)}
      whileInView={moodEntrance(chapter.mood, chapter.emotionalIntensity).animate}
      initial={moodEntrance(chapter.mood, chapter.emotionalIntensity).initial}
      viewport={{ once: true }}
      transition={moodEntrance(chapter.mood, chapter.emotionalIntensity).transition}
    >
      {/* Video replaces image when playing */}
      {chapter.videoUrl && videoPlaying ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: '#000' }}>
          <VideoChapterPlayer
            videoUrl={chapter.videoUrl}
            style={{ borderRadius: 0, height: '100%', aspectRatio: undefined, position: 'absolute', inset: 0, width: '100%' }}
          />
          <button
            type="button"
            onClick={() => setVideoPlaying(false)}
            style={{
              position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 20,
              background: 'rgba(0,0,0,0.55)', color: '#fff', border: '1px solid var(--pl-muted)',
              borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.75rem',
              cursor: 'pointer', letterSpacing: '0.08em',
            }}
          >
            ✕ Close
          </button>
        </div>
      ) : (
        <>
          {mainImage && (
            <motion.div style={{ position: 'absolute', inset: -80, y }}>
              <motion.img src={proxyUrl(mainImage, 2400, 1600)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), filter: imgFilter }} />
            </motion.div>
          )}

          {/* Play button overlay when chapter has video */}
          {chapter.videoUrl && (
            <button
              type="button"
              onClick={() => setVideoPlaying(true)}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 15,
                width: '72px', height: '72px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.1)',
                backdropFilter: 'blur(8px)',
                border: '2px solid var(--pl-ink-soft)',
                color: '#fff',
                fontSize: '1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s, transform 0.2s',
              }}
              onMouseOver={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(255,255,255,0.28)'; b.style.transform = 'translate(-50%, -50%) scale(1.1)'; }}
              onMouseOut={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(0,0,0,0.1)'; b.style.transform = 'translate(-50%, -50%) scale(1)'; }}
              aria-label="Play video"
            >
              ▶
            </button>
          )}
        </>
      )}

      {/* Multi-layer cinematic overlay — strengthened for readability */}
      {!(chapter.videoUrl && videoPlaying) && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.72) 35%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.15) 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 30%)' }} />
        </>
      )}

      {/* Content anchored at bottom — hidden when video playing */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: 'clamp(2rem, 5vw, 5rem) 1.25rem clamp(3rem, 6vw, 7rem)', maxWidth: '900px', color: '#ffffff', width: '100%', display: chapter.videoUrl && videoPlaying ? 'none' : undefined }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ delay: 0.3, duration: 0.9 }}
        >
          {/* Text content block with subtle dark backing for readability */}
          <div style={{
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            borderRadius: '8px',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
          }} className="max-md:px-5 max-md:py-6 max-md:max-w-[90vw] max-md:mx-auto p-8">
            <MoodBadge mood={chapter.mood} light />
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.8, display: 'block', marginBottom: '1.75rem', color: '#ffffff', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
              {formatDateFull(chapter.date)}
            </span>
            <h3 style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(3rem, 7vw, 5.5rem)',
              fontWeight: 600,
              fontStyle: 'italic',
              lineHeight: 1.0,
              margin: '0 0 2rem 0',
              color: '#ffffff',
              textShadow: '0 2px 20px rgba(0,0,0,0.8)',
              letterSpacing: '-0.03em',
            }}>
              <span data-pe-editable="true" data-pe-field="title">{chapter.title}</span>
            </h3>
            <div style={{ marginBottom: '2rem' }}>
              <MoodDecorator mood={chapter.mood} location={chapter.location?.label} light={true} />
            </div>
            <div style={{ width: '1px', height: '40px', background: 'var(--pl-muted)', margin: '0 auto 2.5rem' }} />
            <div style={{ maxWidth: '600px', margin: '0 auto 2rem', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }} data-pe-editable="true" data-pe-field="description">
              <EnhancedDescription text={chapter.description} light />
            </div>
            {chapter.location && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                <LocationPill label={chapter.location.label} light />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.article>
  );
}

// ─── LAYOUT: CINEMATIC (ambient blur quote-style) ───
function CinematicLayout({ chapter, index }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const blur = useTransform(scrollYProgress, [0, 0.5, 1], [60, 80, 60]);
  const hasImages = (chapter.images?.length ?? 0) > 0;
  const mainImage = heroImage(chapter);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  return (
    <>
      <ChapterDivider />
      <motion.article
        ref={ref}
        style={{ position: 'relative', padding: isMobile ? '4rem 1.25rem 4.5rem' : '10rem 2rem', textAlign: 'center', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: isMobile ? '0' : '600px', ...(chapter.styleOverrides?.backgroundColor ? { background: chapter.styleOverrides.backgroundColor } : {}) }}
        {...moodEntrance(chapter.mood, chapter.emotionalIntensity)}
        whileInView={moodEntrance(chapter.mood, chapter.emotionalIntensity).animate}
        initial={moodEntrance(chapter.mood, chapter.emotionalIntensity).initial}
        viewport={{ once: true, margin: '-100px' }}
        transition={moodEntrance(chapter.mood, chapter.emotionalIntensity).transition}
      >
        {/* Video replaces blurred background when playing */}
        {chapter.videoUrl && videoPlaying ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '900px', padding: '0 2rem' }}>
              <VideoChapterPlayer videoUrl={chapter.videoUrl} />
            </div>
            <button
              type="button"
              onClick={() => setVideoPlaying(false)}
              style={{
                position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 20,
                background: 'rgba(0,0,0,0.55)', color: '#fff', border: '1px solid var(--pl-muted)',
                borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.75rem',
                cursor: 'pointer', letterSpacing: '0.08em',
              }}
            >
              ✕ Close
            </button>
          </div>
        ) : (
          <>
            {hasImages && mainImage && (
              <>
                <motion.div style={{
                  position: 'absolute', inset: -120,
                  backgroundImage: `url(${proxyUrl(mainImage, 800, 800)})`,
                  backgroundSize: 'cover', backgroundPosition: focalPos(chapter),
                  filter: `blur(${blur.get()}px) brightness(0.88) saturate(1.6)`,
                  opacity: 0.35, zIndex: 0,
                }} />
                <div style={{ position: 'absolute', inset: 0, background: 'var(--pl-cream)', opacity: 0.82, zIndex: 1 }} />
              </>
            )}
            {/* Play button for cinematic layout */}
            {chapter.videoUrl && (
              <button
                type="button"
                onClick={() => setVideoPlaying(true)}
                style={{
                  position: 'absolute', top: '2rem', right: '2rem', zIndex: 15,
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: 'var(--pl-olive)', color: '#fff',
                  border: 'none', fontSize: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                  transition: 'transform 0.18s',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                aria-label="Play video"
              >
                ▶
              </button>
            )}
          </>
        )}

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '820px', width: '100%', display: chapter.videoUrl && videoPlaying ? 'none' : undefined }}>
          {/* Ghost chapter number */}
          <div style={{ position: 'relative' }}>
            <ChapterGhost number={index + 1} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <MoodBadge mood={chapter.mood} />
              <span style={{ fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--pl-olive)', display: 'block', marginBottom: '3rem', opacity: 0.8 }}>
                {formatDateFull(chapter.date)}
              </span>
              <h3 style={{
                fontFamily: 'var(--pl-font-heading)',
                fontSize: 'clamp(2.5rem, 6vw, 4.8rem)',
                fontWeight: 600,
                fontStyle: 'italic',
                color: chapter.styleOverrides?.textColor || 'var(--pl-ink)',
                lineHeight: 1.1,
                margin: '0 0 2.5rem 0',
                letterSpacing: '-0.03em',
              }}>
                &ldquo;<span data-pe-editable="true" data-pe-field="title">{chapter.title}</span>&rdquo;
              </h3>
              <div style={{ maxWidth: '600px', margin: '0 auto 2rem' }} data-pe-editable="true" data-pe-field="description">
                <EnhancedDescription text={chapter.description} />
              </div>
              {chapter.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 10, skewY: -2 }}
                  whileInView={{ opacity: 1, y: 0, skewY: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
                  style={{ fontStyle: 'italic', color: 'var(--pl-olive)', fontSize: '1rem', marginTop: '1.5rem' }}
                >
                  <span data-pe-editable="true" data-pe-field="subtitle">{chapter.subtitle}</span>
                </motion.p>
              )}
              {chapter.location && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
                  <LocationPill label={chapter.location.label} />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.article>
    </>
  );
}

// ─── LAYOUT: SPLIT (50/50 — large photo + overlapping story card) ───
function SplitLayout({ chapter, index }: TimelineItemProps) {
  const isEven = index % 2 === 0;
  const hasImages = (chapter.images?.length ?? 0) > 0;
  const mainImage = heroImage(chapter);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <>
      <ChapterDivider />
      <motion.article
        style={applyOverrides(chapter, {
          display: 'flex',
          flexDirection: isMobile ? 'column' : (isEven ? 'row' : 'row-reverse'),
          maxWidth: '1300px',
          margin: isMobile ? '2rem auto' : '4rem auto',
          alignItems: 'center',
          gap: '0',
          position: 'relative',
          padding: isMobile ? '0' : '0 3rem',
          minHeight: isMobile ? '0' : '500px',
        })}
        {...moodEntrance(chapter.mood, chapter.emotionalIntensity)}
        whileInView={moodEntrance(chapter.mood, chapter.emotionalIntensity).animate}
        initial={moodEntrance(chapter.mood, chapter.emotionalIntensity).initial}
        viewport={{ once: true, margin: '-100px' }}
        transition={moodEntrance(chapter.mood, chapter.emotionalIntensity).transition}
      >
        {/* Photo — fills its half completely */}
        {hasImages && mainImage && (
          <div
            style={isMobile
              ? { width: '100%', height: '280px', position: 'relative', zIndex: 1, overflow: 'hidden', borderRadius: '0' }
              : { flex: '0 0 50%', height: '660px', position: 'relative', zIndex: 1, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.12)' }
            }
          >
            <img
              src={proxyUrl(mainImage, 1400, 1100)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), display: 'block', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.4s ease' }}
              onMouseOver={e => { const img = e.currentTarget as HTMLImageElement; img.style.transform = 'scale(1.03)'; img.style.filter = 'brightness(1.05)'; }}
              onMouseOut={e => { const img = e.currentTarget as HTMLImageElement; img.style.transform = 'scale(1)'; img.style.filter = 'none'; }}
            />
          </div>
        )}

        {/* Story card — overlaps the photo */}
        <div style={{
          flex: 1,
          padding: isMobile ? '1.75rem 1.25rem 2rem' : '3rem 4rem',
          background: 'var(--pl-cream-card)',
          borderRadius: isMobile ? '0' : '8px',
          boxShadow: isMobile ? 'none' : '0 25px 60px rgba(0,0,0,0.07)',
          position: 'relative',
          zIndex: 2,
          marginLeft: hasImages && isEven && !isMobile ? '-5rem' : '0',
          marginRight: hasImages && !isEven && !isMobile ? '-5rem' : '0',
          marginTop: hasImages && !isMobile ? '2.5rem' : '0',
          backdropFilter: 'blur(12px)',
          width: isMobile ? '100%' : undefined,
        }}>
          {/* Ghost number */}
          <div style={{ position: 'relative' }}>
            <ChapterGhost number={index + 1} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <MoodBadge mood={chapter.mood} />
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--pl-olive)', fontWeight: 700, marginBottom: '1rem', display: 'block' }}>
                {formatDateFull(chapter.date)}
              </span>
              <h3 style={{
                fontFamily: 'var(--pl-font-heading)',
                fontSize: 'clamp(2rem, 3.5vw, 3.5rem)',
                fontWeight: 600,
                fontStyle: 'italic',
                color: 'var(--pl-ink)',
                lineHeight: 1.05,
                margin: '0 0 1rem 0',
                letterSpacing: '-0.03em',
              }}>
                <span data-pe-editable="true" data-pe-field="title">{chapter.title}</span>
              </h3>
              {chapter.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 10, skewY: -2 }}
                  whileInView={{ opacity: 1, y: 0, skewY: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
                  style={{ fontStyle: 'italic', color: 'var(--pl-muted)', fontSize: '1.05rem', marginBottom: '1.75rem', fontFamily: 'var(--pl-font-heading)', fontWeight: 300 }}
                >
                  <span data-pe-editable="true" data-pe-field="subtitle">{chapter.subtitle}</span>
                </motion.p>
              )}
              <div data-pe-editable="true" data-pe-field="description"><EnhancedDescription text={chapter.description} /></div>
              {chapter.location && (
                <div style={{ marginTop: '2.5rem' }}>
                  <LocationPill label={chapter.location.label} />
                </div>
              )}
              {chapter.videoUrl && (
                <CollapsibleVideo videoUrl={chapter.videoUrl} />
              )}
            </div>
          </div>
        </div>
      </motion.article>
    </>
  );
}

// ─── LAYOUT: GALLERY (editorial asymmetric masonry grid) ───
function GalleryLayout({ chapter, index }: TimelineItemProps) {
  const images = chapter.images.slice(0, 4);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  return (
    <>
      <ChapterDivider />
      <motion.article
        style={applyOverrides(chapter, { maxWidth: '1300px', margin: isMobile ? '2rem auto' : '4rem auto', padding: isMobile ? '0 1.25rem' : '0 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' })}
        {...moodEntrance(chapter.mood, chapter.emotionalIntensity)}
        whileInView={moodEntrance(chapter.mood, chapter.emotionalIntensity).animate}
        initial={moodEntrance(chapter.mood, chapter.emotionalIntensity).initial}
        viewport={{ once: true, margin: '-100px' }}
        transition={moodEntrance(chapter.mood, chapter.emotionalIntensity).transition}
      >
        {/* Centered editorial header */}
        <div style={{ textAlign: 'center', padding: isMobile ? '0 0 2rem' : '0 1rem 5rem', maxWidth: '760px', position: 'relative' }}>
          <ChapterGhost number={index + 1} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <MoodBadge mood={chapter.mood} />
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--pl-olive)', fontWeight: 700, display: 'block', marginBottom: '1.25rem' }}>
              {formatDateFull(chapter.date)}
            </span>
            <h3 style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 600,
              fontStyle: 'italic',
              color: 'var(--pl-ink)',
              lineHeight: 1.05,
              margin: '0 0 1.1rem 0',
              letterSpacing: '-0.03em',
            }}>
              <span data-pe-editable="true" data-pe-field="title">{chapter.title}</span>
            </h3>
            {chapter.subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 10, skewY: -2 }}
                whileInView={{ opacity: 1, y: 0, skewY: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
                style={{ fontStyle: 'italic', color: 'var(--pl-muted)', fontSize: '1.1rem', marginBottom: '1.75rem', fontFamily: 'var(--pl-font-heading)', fontWeight: 300 }}
              >
                <span data-pe-editable="true" data-pe-field="subtitle">{chapter.subtitle}</span>
              </motion.p>
            )}
            <div data-pe-editable="true" data-pe-field="description"><EnhancedDescription text={chapter.description} /></div>
            {chapter.location && (
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                <LocationPill label={chapter.location.label} />
              </div>
            )}
          </div>
        </div>

        {/* Masonry-style asymmetric grid — desktop / simple scroll grid — mobile */}
        {images.length > 0 && (isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            {/* Mobile: lead image 4:3, remaining in 2-col row */}
            {images[0] && (
              <motion.div
                style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', aspectRatio: '4/3', background: 'var(--pl-olive-mist)' }}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <img src={proxyUrl(images[0].url, 900, 675)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), display: 'block' }} />
              </motion.div>
            )}
            {images.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(images.length - 1, 3)}, 1fr)`, gap: '0.5rem' }}>
                {images.slice(1, 4).map((img, i) => (
                  <motion.div key={img.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: '6px', aspectRatio: '1/1', background: 'var(--pl-olive-mist)' }}
                    initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <img src={proxyUrl(img.url, 400, 400)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), display: 'block' }} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: images.length >= 3 ? 'repeat(12, 1fr)' : (images.length === 2 ? '1fr 1fr' : '1fr'),
            gridTemplateRows: images.length >= 3 ? 'repeat(2, 360px)' : '520px',
            gap: '1rem',
            width: '100%',
          }}>
            {images[0] && (
              <motion.div
                style={{ gridColumn: images.length >= 3 ? '1 / 8' : 'auto', gridRow: images.length >= 3 ? '1 / 3' : 'auto', position: 'relative', overflow: 'hidden', borderRadius: '6px', background: 'var(--pl-olive-mist)', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                initial={{ opacity: 0, scale: 0.96, y: 20 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                onMouseOver={() => setHoveredIdx(0)} onMouseOut={() => setHoveredIdx(null)}
              >
                <img src={proxyUrl(images[0].url, 1400, 1000)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.4s ease', transform: hoveredIdx === 0 ? 'scale(1.03)' : 'scale(1)', filter: hoveredIdx === 0 ? 'brightness(1.05)' : 'none' }} />
                {images[0].caption && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: '#fff', fontSize: '0.7rem', fontStyle: 'italic', opacity: hoveredIdx === 0 ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: 'none' }}>{images[0].caption}</div>}
              </motion.div>
            )}
            {images[1] && (
              <motion.div
                style={{ gridColumn: images.length >= 3 ? '8 / 13' : 'auto', gridRow: images.length >= 3 ? '1 / 2' : 'auto', position: 'relative', overflow: 'hidden', borderRadius: '6px', background: 'var(--pl-olive-mist)', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}
                initial={{ opacity: 0, scale: 0.96, y: 20 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
                onMouseOver={() => setHoveredIdx(1)} onMouseOut={() => setHoveredIdx(null)}
              >
                <img src={proxyUrl(images[1].url, 800, 600)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.4s ease', transform: hoveredIdx === 1 ? 'scale(1.03)' : 'scale(1)', filter: hoveredIdx === 1 ? 'brightness(1.05)' : 'none' }} />
                {images[1].caption && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: '#fff', fontSize: '0.7rem', fontStyle: 'italic', opacity: hoveredIdx === 1 ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: 'none' }}>{images[1].caption}</div>}
              </motion.div>
            )}
            {images[2] && (
              <motion.div
                style={{ gridColumn: images.length >= 3 ? '8 / 13' : 'auto', gridRow: images.length >= 3 ? '2 / 3' : 'auto', position: 'relative', overflow: 'hidden', borderRadius: '6px', background: 'var(--pl-olive-mist)', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}
                initial={{ opacity: 0, scale: 0.96, y: 20 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.32 }}
                onMouseOver={() => setHoveredIdx(2)} onMouseOut={() => setHoveredIdx(null)}
              >
                <img src={proxyUrl(images[2].url, 800, 600)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.4s ease', transform: hoveredIdx === 2 ? 'scale(1.03)' : 'scale(1)', filter: hoveredIdx === 2 ? 'brightness(1.05)' : 'none' }} />
                {images[2].caption && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: '#fff', fontSize: '0.7rem', fontStyle: 'italic', opacity: hoveredIdx === 2 ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: 'none' }}>{images[2].caption}</div>}
              </motion.div>
            )}
            {images[3] && (
              <motion.div
                style={{ gridColumn: 'auto', gridRow: 'auto', position: 'relative', overflow: 'hidden', borderRadius: '6px', background: 'var(--pl-olive-mist)', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}
                initial={{ opacity: 0, scale: 0.96, y: 20 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.46 }}
                onMouseOver={() => setHoveredIdx(3)} onMouseOut={() => setHoveredIdx(null)}
              >
                <img src={proxyUrl(images[3].url, 800, 600)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.4s ease', transform: hoveredIdx === 3 ? 'scale(1.03)' : 'scale(1)', filter: hoveredIdx === 3 ? 'brightness(1.05)' : 'none' }} />
                {images[3].caption && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: '#fff', fontSize: '0.7rem', fontStyle: 'italic', opacity: hoveredIdx === 3 ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: 'none' }}>{images[3].caption}</div>}
              </motion.div>
            )}
          </div>
        ))}
      </motion.article>
    </>
  );
}

// ─── LAYOUT: MOSAIC (scattered polaroids with micro-rotations) ───
const ROTATIONS = [-3.5, 2.8, -1.5, 3.2, -2.2, 1.8];
const OFFSETS: Array<{ x: number | string; y: number }> = [
  { x: 0, y: 0 }, { x: '40%', y: 20 }, { x: '60%', y: 140 },
  { x: '8%', y: 260 }, { x: '50%', y: 320 }, { x: '20%', y: 440 },
];

function MosaicLayout({ chapter, index }: TimelineItemProps) {
  const images = chapter.images.slice(0, 5);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredMosaicIdx, setHoveredMosaicIdx] = useState<number | null>(null);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const mobileImages = images.slice(0, 2);
  const displayImages = isMobile ? mobileImages : images;

  return (
    <>
      <ChapterDivider />
      <motion.article
        style={applyOverrides(chapter, { maxWidth: '1300px', margin: isMobile ? '2rem auto' : '4rem auto', padding: isMobile ? '1.5rem 1.25rem 2.5rem' : '5rem 3rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1.5rem' : '5rem', alignItems: 'flex-start' })}
        className=""
        {...moodEntrance(chapter.mood, chapter.emotionalIntensity)}
        whileInView={moodEntrance(chapter.mood, chapter.emotionalIntensity).animate}
        initial={moodEntrance(chapter.mood, chapter.emotionalIntensity).initial}
        viewport={{ once: true, margin: '-80px' }}
        transition={moodEntrance(chapter.mood, chapter.emotionalIntensity).transition}
      >
        {/* On mobile: text first so heading is never hidden behind polaroids */}
        {isMobile && (
          <motion.div
            style={{ width: '100%', position: 'relative' }}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.1, duration: 0.85 }}
          >
            <ChapterGhost number={index + 1} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <MoodBadge mood={chapter.mood} />
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--pl-olive)', fontWeight: 700, display: 'block', marginBottom: '1rem' }}>
                {formatDateFull(chapter.date)}
              </span>
              <h3 style={{
                fontFamily: 'var(--pl-font-heading)',
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                fontWeight: 600,
                fontStyle: 'italic',
                color: 'var(--pl-ink)',
                lineHeight: 1.05,
                margin: '0 0 1.25rem 0',
                letterSpacing: '-0.03em',
              }}>
                <span data-pe-editable="true" data-pe-field="title">{chapter.title}</span>
              </h3>
              {chapter.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 10, skewY: -2 }}
                  whileInView={{ opacity: 1, y: 0, skewY: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
                  style={{ fontStyle: 'italic', color: 'var(--pl-muted)', fontSize: '1.1rem', marginBottom: '1.75rem', fontFamily: 'var(--pl-font-heading)', fontWeight: 300 }}
                >
                  <span data-pe-editable="true" data-pe-field="subtitle">{chapter.subtitle}</span>
                </motion.p>
              )}
              <div data-pe-editable="true" data-pe-field="description"><EnhancedDescription text={chapter.description} /></div>
              {chapter.location && (
                <div style={{ marginTop: '2.5rem' }}>
                  <LocationPill label={chapter.location.label} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Polaroid collage */}
        <div
          style={isMobile
            ? { width: '100%', maxHeight: '280px', display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'flex-start' }
            : { flex: '0 0 50%', position: 'relative', height: images.length > 1 ? '580px' : '420px' }
          }
        >
          {displayImages.map((img, i) => {
            const rotate = isMobile ? (i === 0 ? -2 : 2) : ROTATIONS[i % ROTATIONS.length];
            const offset = OFFSETS[i % OFFSETS.length];
            const isFirst = i === 0;

            if (isMobile) {
              return (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    flex: '0 0 45%',
                    cursor: 'pointer',
                    transform: `rotate(${rotate}deg)`,
                    transformOrigin: 'center center',
                  }}
                  onMouseOver={() => setHoveredMosaicIdx(i)}
                  onMouseOut={() => setHoveredMosaicIdx(null)}
                >
                  <div style={{
                    background: '#fff',
                    padding: '8px 8px 28px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(43,30,20,0.05)',
                    borderRadius: '2px',
                    position: 'relative',
                  }}>
                    <div style={{ aspectRatio: '1/1', overflow: 'hidden', background: 'var(--pl-olive-mist)', position: 'relative' }}>
                      <img src={proxyUrl(img.url, 400, 400)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), display: 'block' }} />
                      {img.caption && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: '#fff', fontSize: '0.7rem', fontStyle: 'italic', letterSpacing: '0.03em', opacity: hoveredMosaicIdx === i ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: 'none' }}>
                          {img.caption}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.9, rotate: rotate * 2 }}
                whileInView={{ opacity: 1, scale: 1, rotate }}
                whileHover={{ scale: 1.05, rotate: 0, zIndex: 20 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'absolute',
                  left: typeof offset.x === 'string' ? offset.x : offset.x,
                  top: offset.y,
                  width: isFirst ? '62%' : '42%',
                  zIndex: images.length - i,
                  cursor: 'pointer',
                  transformOrigin: 'center center',
                }}
                onMouseOver={() => setHoveredMosaicIdx(i)}
                onMouseOut={() => setHoveredMosaicIdx(null)}
              >
                {/* Polaroid frame */}
                <div style={{
                  background: '#fff',
                  padding: isFirst ? '10px 10px 36px' : '8px 8px 28px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(43,30,20,0.05)',
                  borderRadius: '2px',
                }}>
                  <div style={{ aspectRatio: isFirst ? '4/5' : '1/1', overflow: 'hidden', background: 'var(--pl-olive-mist)', position: 'relative' }}>
                    <img src={proxyUrl(img.url, 600, 800)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focalPos(chapter), display: 'block' }} />
                    {img.caption && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: '#fff', fontSize: '0.7rem', fontStyle: 'italic', letterSpacing: '0.03em', opacity: hoveredMosaicIdx === i ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: 'none' }}>
                        {img.caption}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Text column — desktop only (mobile version rendered above) */}
        {!isMobile && (
          <motion.div
            style={{ flex: 1, paddingTop: '3rem', position: 'relative' }}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.3, duration: 0.85 }}
          >
            <ChapterGhost number={index + 1} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <MoodBadge mood={chapter.mood} />
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--pl-olive)', fontWeight: 700, display: 'block', marginBottom: '1rem' }}>
                {formatDateFull(chapter.date)}
              </span>
              <h3 style={{
                fontFamily: 'var(--pl-font-heading)',
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                fontWeight: 600,
                fontStyle: 'italic',
                color: 'var(--pl-ink)',
                lineHeight: 1.05,
                margin: '0 0 1.25rem 0',
                letterSpacing: '-0.03em',
              }}>
                <span data-pe-editable="true" data-pe-field="title">{chapter.title}</span>
              </h3>
              {chapter.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 10, skewY: -2 }}
                  whileInView={{ opacity: 1, y: 0, skewY: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
                  style={{ fontStyle: 'italic', color: 'var(--pl-muted)', fontSize: '1.1rem', marginBottom: '1.75rem', fontFamily: 'var(--pl-font-heading)', fontWeight: 300 }}
                >
                  <span data-pe-editable="true" data-pe-field="subtitle">{chapter.subtitle}</span>
                </motion.p>
              )}
              <div data-pe-editable="true" data-pe-field="description"><EnhancedDescription text={chapter.description} /></div>
              {chapter.location && (
                <div style={{ marginTop: '2.5rem' }}>
                  <LocationPill label={chapter.location.label} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.article>
    </>
  );
}

// ─── MAIN ROUTER ─────────────────────────────────────────────
const LAYOUT_CYCLE: Array<Chapter['layout']> = ['editorial', 'fullbleed', 'split', 'mosaic', 'cinematic', 'gallery'];

export function TimelineItem({ chapter, index, chapterIcon }: TimelineItemProps) {
  const hasImages = (chapter.images?.length ?? 0) > 0;
  const imageCount = chapter.images?.length ?? 0;
  const intensity = chapter.emotionalIntensity ?? 5;

  // Emotional intensity + photo count → optimal layout selection
  const rawLayout = chapter.layout || (() => {
    if (!hasImages) return 'editorial';
    if (intensity >= 8 && imageCount >= 1) return index % 2 === 0 ? 'cinematic' : 'fullbleed';
    if (intensity <= 3) return 'editorial';
    if (imageCount >= 4) return index % 2 === 0 ? 'mosaic' : 'gallery';
    if (imageCount === 3) return 'gallery';
    if (imageCount === 2) return index % 2 === 0 ? 'split' : 'editorial';
    return LAYOUT_CYCLE[index % LAYOUT_CYCLE.length];
  })();
  const layout = hasImages ? rawLayout : 'editorial';

  const inner = (() => {
    switch (layout) {
      case 'fullbleed': return <FullbleedLayout chapter={chapter} index={index} />;
      case 'split': return <SplitLayout chapter={chapter} index={index} />;
      case 'cinematic': return <CinematicLayout chapter={chapter} index={index} />;
      case 'gallery': return <GalleryLayout chapter={chapter} index={index} />;
      case 'mosaic': return <MosaicLayout chapter={chapter} index={index} />;
      case 'editorial':
      default: return <EditorialLayout chapter={chapter} index={index} />;
    }
  })();

  const isPeak = chapter.isEmotionalPeak || intensity >= 8;

  // Wrap with icon overlay + optional peak marker
  const withIcon = chapterIcon ? (
    <div style={{ position: 'relative' }}>
      {inner}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '2.5rem',
          right: '2.5rem',
          width: '64px',
          height: '64px',
          opacity: 0.22,
          pointerEvents: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(chapterIcon) }}
      />
    </div>
  ) : inner;

  const wrapped = (
    <div className="pl-scroll-fade-up" data-pe-chapter={chapter.id} data-pe-section="chapter" data-pe-label={`Chapter ${index + 1}`}>
      {withIcon}
    </div>
  );

  if (isPeak && index > 0) {
    return (
      <>
        <EmotionalPeakMarker />
        {wrapped}
      </>
    );
  }

  return wrapped;
}
