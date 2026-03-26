'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/timeline-item.tsx
// Dynamic Multi-Layout Chapter Renderer — Ultra-Premium Editorial
// Layouts: editorial | fullbleed | split | cinematic | gallery | mosaic
// ─────────────────────────────────────────────────────────────

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MapPin } from 'lucide-react';
import type { Chapter } from '@/types';

interface TimelineItemProps {
  chapter: Chapter;
  index: number;
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
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

// Shared pill-badge for mood tagging
function MoodBadge({ mood, light = false }: { mood?: string; light?: boolean }) {
  if (!mood) return null;
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '0.65rem',
      fontWeight: 700,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      padding: '0.3rem 0.85rem',
      borderRadius: '100px',
      background: light ? 'rgba(255,255,255,0.12)' : 'var(--eg-accent-light)',
      color: light ? 'rgba(255,255,255,0.75)' : 'var(--eg-accent)',
      border: light ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.04)',
      backdropFilter: light ? 'blur(8px)' : 'none',
      marginBottom: '1.25rem',
    }}>{mood}</span>
  );
}

// ─── LAYOUT: EDITORIAL (vogue-style overlapping images) ───
function EditorialLayout({ chapter, index }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isEven = index % 2 === 0;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['0 1.2', '1 0.8'] });
  const imgY1 = useTransform(scrollYProgress, [0, 1], ['12%', '-12%']);
  const imgY2 = useTransform(scrollYProgress, [0, 1], ['-8%', '18%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['10%', '-5%']);

  const mainImage = chapter.images[0]?.url || '';
  const secondImage = chapter.images[1]?.url || '';

  return (
    <motion.article
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: isEven ? 'row' : 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7rem',
        padding: '5rem 4rem',
        maxWidth: '1300px',
        margin: '0 auto',
        width: '100%',
        position: 'relative',
      }}
      className="max-md:flex-col max-md:gap-8 max-md:px-6"
      initial={{ opacity: 0, y: 70 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Editorial Image Stack */}
      <div style={{ flex: '0 0 44%', position: 'relative', minHeight: '620px' }} className="max-md:w-full max-md:min-h-[380px]">
        {mainImage && (
          <motion.div style={{
            position: 'absolute',
            width: secondImage ? '80%' : '100%',
            aspectRatio: '3/4',
            borderRadius: '3px',
            overflow: 'hidden',
            zIndex: 2,
            y: imgY1,
            left: isEven ? 0 : 'auto',
            right: isEven ? 'auto' : 0,
            boxShadow: '0 40px 80px rgba(0,0,0,0.12), 0 10px 20px rgba(0,0,0,0.06)',
          }}>
            <img src={proxyUrl(mainImage, 1200, 1600)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
        )}
        {secondImage && (
          <motion.div style={{
            position: 'absolute',
            width: '58%',
            aspectRatio: '4/5',
            borderRadius: '3px',
            overflow: 'hidden',
            zIndex: 1,
            y: imgY2,
            right: isEven ? 0 : 'auto',
            left: isEven ? 'auto' : 0,
            top: '12%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.08)',
            filter: 'grayscale(18%) brightness(0.97)',
          }}>
            <img src={proxyUrl(secondImage, 800, 1000)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
        )}
      </div>

      {/* Typography Column */}
      <motion.div style={{ flex: 1, textAlign: isEven ? 'left' : 'right', y: textY, position: 'relative', zIndex: 10 }} className="max-md:text-center">
        <MoodBadge mood={chapter.mood} />
        <div style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--eg-accent)', fontWeight: 700 }}>{formatDate(chapter.date)}</span>
          <div style={{ width: '100%', height: '1px', background: 'var(--eg-accent)', opacity: 0.25, marginTop: '0.5rem' }} />
        </div>
        <h3 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(2.6rem, 5vw, 4.2rem)',
          fontWeight: 400,
          color: 'var(--eg-fg)',
          lineHeight: 1.0,
          margin: '0 0 1.25rem 0',
          letterSpacing: '-0.025em',
        }}>{chapter.title}</h3>
        {chapter.subtitle && (
          <p style={{ fontStyle: 'italic', color: 'var(--eg-muted)', fontSize: '1.2rem', marginBottom: '2.25rem', fontFamily: 'var(--eg-font-heading)', fontWeight: 300 }}>
            {chapter.subtitle}
          </p>
        )}
        <p style={{ color: 'var(--eg-muted)', lineHeight: 2, fontSize: '1rem', maxWidth: '460px', margin: isEven ? '0' : '0 0 0 auto', fontWeight: 300 }} className="max-md:mx-auto">
          {chapter.description}
        </p>
        {chapter.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3rem', color: 'var(--eg-fg)', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', justifyContent: isEven ? 'flex-start' : 'flex-end', opacity: 0.5 }} className="max-md:justify-center">
            <MapPin size={12} />
            <span>{chapter.location.label}</span>
          </div>
        )}
      </motion.div>
    </motion.article>
  );
}

// ─── LAYOUT: FULLBLEED (cinematic 100vh with dramatic overlay) ───
function FullbleedLayout({ chapter }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-18%', '18%']);
  const mainImage = chapter.images[0]?.url || '';

  return (
    <motion.article
      ref={ref}
      style={{ position: 'relative', height: '100vh', minHeight: '700px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.4 }}
    >
      <motion.div style={{ position: 'absolute', inset: -80, y }}>
        <img src={proxyUrl(mainImage, 2400, 1600)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.45) contrast(1.2) saturate(1.15)' }} />
      </motion.div>

      {/* Multi-layer cinematic overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.5) 30%, transparent 60%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%)' }} />

      {/* Centered content anchored at bottom */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '5rem 2rem 7rem', maxWidth: '900px', color: '#ffffff', width: '100%' }}>
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.9 }}>
          <MoodBadge mood={chapter.mood} light />
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.35em', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '2rem' }}>
            {formatDate(chapter.date)}
          </span>
          <h3 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(3rem, 7vw, 5.5rem)',
            fontWeight: 400,
            lineHeight: 1.0,
            margin: '0 0 2rem 0',
            textShadow: '0 10px 30px rgba(0,0,0,0.4)',
            letterSpacing: '-0.02em',
          }}>{chapter.title}</h3>
          <div style={{ width: '1px', height: '60px', background: 'rgba(255,255,255,0.25)', margin: '0 auto 2.5rem' }} />
          <p style={{ lineHeight: 2, fontSize: '1.1rem', opacity: 0.85, fontWeight: 300, maxWidth: '600px', margin: '0 auto' }}>
            {chapter.description}
          </p>
          {chapter.location && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '3rem', opacity: 0.5, fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              <MapPin size={12} /><span>{chapter.location.label}</span>
            </div>
          )}
        </motion.div>
      </div>
    </motion.article>
  );
}

// ─── LAYOUT: CINEMATIC (ambient blur quote-style) ───
function CinematicLayout({ chapter }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const blur = useTransform(scrollYProgress, [0, 0.5, 1], [60, 80, 60]);
  const mainImage = chapter.images[0]?.url || '';

  return (
    <motion.article
      ref={ref}
      style={{ position: 'relative', padding: '10rem 2rem', textAlign: 'center', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2 }}
    >
      {/* Ambient backdrop */}
      {mainImage && (
        <>
          <motion.div style={{
            position: 'absolute', inset: -120,
            backgroundImage: `url(${proxyUrl(mainImage, 800, 800)})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: `blur(${blur.get()}px) brightness(0.88) saturate(1.6)`,
            opacity: 0.35, zIndex: 0,
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'var(--eg-bg)', opacity: 0.72, zIndex: 1 }} />
        </>
      )}

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '820px', width: '100%' }}>
        <MoodBadge mood={chapter.mood} />
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--eg-accent)', display: 'block', marginBottom: '3.5rem', opacity: 0.8 }}>
          {formatDate(chapter.date)}
        </span>
        <h3 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(2.5rem, 6vw, 4.8rem)',
          fontWeight: 400,
          fontStyle: 'italic',
          color: 'var(--eg-fg)',
          lineHeight: 1.15,
          margin: '0 0 3rem 0',
          letterSpacing: '-0.025em',
        }}>
          &ldquo;{chapter.title}&rdquo;
        </h3>
        <p style={{ fontSize: '1.2rem', lineHeight: 2.1, color: 'var(--eg-fg)', fontFamily: 'var(--eg-font-body)', fontWeight: 300, opacity: 0.75, maxWidth: '680px', margin: '0 auto 2.5rem' }}>
          {chapter.description}
        </p>
        <p style={{ fontStyle: 'italic', color: 'var(--eg-accent)', fontSize: '1rem' }}>{chapter.subtitle}</p>
      </div>
    </motion.article>
  );
}

// ─── LAYOUT: SPLIT (full photo with overlapping story card) ───
function SplitLayout({ chapter, index }: TimelineItemProps) {
  const isEven = index % 2 === 0;
  const mainImage = chapter.images[0]?.url || '';

  return (
    <motion.article
      style={{
        display: 'flex',
        flexDirection: isEven ? 'row' : 'row-reverse',
        maxWidth: '1300px',
        margin: '4rem auto',
        alignItems: 'center',
        gap: '0',
        position: 'relative',
        padding: '0 3rem',
      }}
      className="max-md:flex-col max-md:px-4"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{ flex: '0 0 55%', height: '640px', position: 'relative', zIndex: 1, borderRadius: '6px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' }} className="max-md:w-full max-md:h-[380px]">
        {mainImage && <img src={proxyUrl(mainImage, 1400, 1100)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.8s ease' }} />}
      </div>

      <div style={{
        flex: 1,
        padding: '3.5rem 4rem',
        background: 'var(--eg-card-bg)',
        borderRadius: '6px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.06)',
        position: 'relative',
        zIndex: 2,
        marginLeft: isEven ? '-5rem' : '0',
        marginRight: isEven ? '0' : '-5rem',
        marginTop: '2.5rem',
      }} className="max-md:m-0 max-md:-mt-12 max-md:mx-6 max-md:p-8">
        <MoodBadge mood={chapter.mood} />
        <span style={{ fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--eg-accent)', fontWeight: 700, marginBottom: '1.25rem', display: 'block' }}>
          {formatDate(chapter.date)}
        </span>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 400, color: 'var(--eg-fg)', lineHeight: 1.1, margin: '0 0 1rem 0' }}>
          {chapter.title}
        </h3>
        <p style={{ fontStyle: 'italic', color: 'var(--eg-muted)', fontSize: '1.05rem', marginBottom: '2rem', fontFamily: 'var(--eg-font-heading)', fontWeight: 300 }}>
          {chapter.subtitle}
        </p>
        <p style={{ color: 'var(--eg-muted)', lineHeight: 2, fontSize: '0.95rem', fontWeight: 300 }}>
          {chapter.description}
        </p>
        {chapter.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2.5rem', color: 'var(--eg-muted)', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6 }}>
            <MapPin size={11} /><span>{chapter.location.label}</span>
          </div>
        )}
      </div>
    </motion.article>
  );
}

// ─── LAYOUT: GALLERY (editorial asymmetric masonry) ───
function GalleryLayout({ chapter }: TimelineItemProps) {
  const images = chapter.images.slice(0, 4);

  return (
    <motion.article
      style={{ maxWidth: '1300px', margin: '4rem auto', padding: '0 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
      className="max-md:px-4"
    >
      {/* Centered editorial header */}
      <div style={{ textAlign: 'center', padding: '0 1rem 5rem', maxWidth: '760px' }}>
        <MoodBadge mood={chapter.mood} />
        <span style={{ fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--eg-accent)', fontWeight: 700, display: 'block', marginBottom: '1.5rem' }}>
          {formatDate(chapter.date)}
        </span>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', fontWeight: 400, color: 'var(--eg-fg)', lineHeight: 1.05, margin: '0 0 1.25rem 0' }}>
          {chapter.title}
        </h3>
        <p style={{ fontStyle: 'italic', color: 'var(--eg-muted)', fontSize: '1.2rem', marginBottom: '2rem', fontFamily: 'var(--eg-font-heading)', fontWeight: 300 }}>
          {chapter.subtitle}
        </p>
        <p style={{ color: 'var(--eg-muted)', lineHeight: 2, fontSize: '1rem', fontWeight: 300 }}>{chapter.description}</p>
      </div>

      {/* Asymmetric grid - always has at least 1 image */}
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: images.length >= 3 ? 'repeat(12, 1fr)' : (images.length === 2 ? '1fr 1fr' : '1fr'),
          gridTemplateRows: images.length >= 3 ? 'repeat(2, 360px)' : '520px',
          gap: '1.25rem',
          width: '100%',
        }} className="max-md:flex max-md:flex-col">
          {images[0] && (
            <div style={{ gridColumn: images.length >= 3 ? '1 / 8' : 'auto', gridRow: images.length >= 3 ? '1 / 3' : 'auto', position: 'relative', overflow: 'hidden', borderRadius: '4px', background: 'var(--eg-accent-light)' }}>
              <img src={proxyUrl(images[0].url, 1400, 1000)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s ease' }} />
            </div>
          )}
          {images[1] && (
            <div style={{ gridColumn: images.length >= 3 ? '8 / 13' : 'auto', gridRow: images.length >= 3 ? '1 / 2' : 'auto', position: 'relative', overflow: 'hidden', borderRadius: '4px', background: 'var(--eg-accent-light)' }}>
              <img src={proxyUrl(images[1].url, 800, 600)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s ease' }} />
            </div>
          )}
          {images[2] && (
            <div style={{ gridColumn: images.length >= 3 ? '8 / 13' : 'auto', gridRow: images.length >= 3 ? '2 / 3' : 'auto', position: 'relative', overflow: 'hidden', borderRadius: '4px', background: 'var(--eg-accent-light)' }}>
              <img src={proxyUrl(images[2].url, 800, 600)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s ease' }} />
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
}

// ─── LAYOUT: MOSAIC (scattered polaroids with micro-rotations) ───
const ROTATIONS = [-3.5, 2.8, -1.5, 3.2, -2.2, 1.8];
const OFFSETS = [
  { x: 0, y: 0 }, { x: '40%', y: 20 }, { x: '60%', y: 140 },
  { x: '8%', y: 260 }, { x: '50%', y: 320 }, { x: '20%', y: 440 }
];

function MosaicLayout({ chapter }: TimelineItemProps) {
  const images = chapter.images.slice(0, 5);

  return (
    <motion.article
      style={{ maxWidth: '1300px', margin: '4rem auto', padding: '5rem 3rem', display: 'flex', gap: '5rem', alignItems: 'flex-start' }}
      className="max-md:flex-col max-md:px-4 max-md:gap-8"
      initial={{ opacity: 0} }
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8 }}
    >
      {/* Polaroid collage left side */}
      <div style={{ flex: '0 0 50%', position: 'relative', height: images.length > 1 ? '580px' : '420px' }} className="max-md:w-full max-md:h-[340px]">
        {images.map((img, i) => {
          const rotate = ROTATIONS[i % ROTATIONS.length];
          const offset = OFFSETS[i % OFFSETS.length];
          const isFirst = i === 0;

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
            >
              {/* Polaroid frame */}
              <div style={{
                background: '#fff',
                padding: isFirst ? '10px 10px 36px' : '8px 8px 28px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                borderRadius: '2px',
              }}>
                <div style={{ aspectRatio: isFirst ? '4/5' : '1/1', overflow: 'hidden', background: 'var(--eg-accent-light)' }}>
                  <img src={proxyUrl(img.url, 600, 800)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Text column */}
      <motion.div
        style={{ flex: 1, paddingTop: '3rem' }}
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.85 }}
        className="max-md:pt-0"
      >
        <MoodBadge mood={chapter.mood} />
        <span style={{ fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--eg-accent)', fontWeight: 700, display: 'block', marginBottom: '1.25rem' }}>
          {formatDate(chapter.date)}
        </span>
        <h3 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(2.4rem, 4vw, 3.5rem)',
          fontWeight: 400,
          color: 'var(--eg-fg)',
          lineHeight: 1.08,
          margin: '0 0 1.5rem 0',
          letterSpacing: '-0.025em',
        }}>{chapter.title}</h3>
        {chapter.subtitle && (
          <p style={{ fontStyle: 'italic', color: 'var(--eg-muted)', fontSize: '1.15rem', marginBottom: '2rem', fontFamily: 'var(--eg-font-heading)', fontWeight: 300 }}>
            {chapter.subtitle}
          </p>
        )}
        <p style={{ color: 'var(--eg-muted)', lineHeight: 2.05, fontSize: '1rem', fontWeight: 300 }}>
          {chapter.description}
        </p>
        {chapter.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2.5rem', color: 'var(--eg-muted)', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6 }}>
            <MapPin size={11} /><span>{chapter.location.label}</span>
          </div>
        )}
      </motion.div>
    </motion.article>
  );
}

// ─── MAIN ROUTER ─────────────────────────────────────────────
const LAYOUT_CYCLE: Array<Chapter['layout']> = ['editorial', 'fullbleed', 'split', 'mosaic', 'cinematic', 'gallery'];

export function TimelineItem({ chapter, index }: TimelineItemProps) {
  const layout = chapter.layout || LAYOUT_CYCLE[index % LAYOUT_CYCLE.length];

  switch (layout) {
    case 'fullbleed': return <FullbleedLayout chapter={chapter} index={index} />;
    case 'split': return <SplitLayout chapter={chapter} index={index} />;
    case 'cinematic': return <CinematicLayout chapter={chapter} index={index} />;
    case 'gallery': return <GalleryLayout chapter={chapter} index={index} />;
    case 'mosaic': return <MosaicLayout chapter={chapter} index={index} />;
    case 'editorial':
    default: return <EditorialLayout chapter={chapter} index={index} />;
  }
}
