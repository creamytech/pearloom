'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/timeline-item.tsx
// Dynamic Multi-Layout Chapter Renderer
// Supports: editorial, fullbleed, split, cinematic, gallery
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

// ─── LAYOUT: EDITORIAL (alternating side-by-side) ───
function EditorialLayout({ chapter, index }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isEven = index % 2 === 0;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['0 1.2', '1 0.8'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['5%', '-5%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['15%', '-15%']);
  const mainImage = chapter.images[0]?.url || '';

  return (
    <motion.article ref={ref} style={{ display: 'flex', flexDirection: isEven ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: '4rem', padding: '0 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}
      className="max-md:flex-col! max-md:gap-6!" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
      <div style={{ flex: '0 0 45%', position: 'relative', aspectRatio: '3/4', overflow: 'hidden', borderRadius: 'var(--eg-radius)', boxShadow: 'var(--eg-card-shadow)', border: 'var(--eg-card-border)' }} className="max-md:w-full! max-md:aspect-[4/5]!">
        <motion.img src={proxyUrl(mainImage, 1200, 1600)} alt={chapter.title} style={{ width: '100%', height: '110%', objectFit: 'cover', y: imgY }} />
      </div>
      <motion.div style={{ flex: 1, textAlign: isEven ? 'left' : 'right', y: textY, padding: '1rem 0' }} className="max-md:text-center!">
        <span style={{ fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--eg-accent)', fontWeight: 500, display: 'block', marginBottom: '1rem' }}>{formatDate(chapter.date)}</span>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 400, color: 'var(--eg-fg)', lineHeight: 1.15, margin: '0 0 0.75rem 0' }}>{chapter.title}</h3>
        <p style={{ fontStyle: 'italic', color: 'var(--eg-accent)', fontSize: '1rem', marginBottom: '1.5rem', fontFamily: 'var(--eg-font-heading)' }}>{chapter.subtitle}</p>
        <p style={{ color: 'var(--eg-muted)', lineHeight: 1.8, fontSize: '0.95rem', maxWidth: '480px', margin: isEven ? '0' : '0 0 0 auto' }} className="max-md:mx-auto!">{chapter.description}</p>
        {chapter.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.5rem', color: 'var(--eg-accent)', fontSize: '0.85rem', justifyContent: isEven ? 'flex-start' : 'flex-end' }} className="max-md:justify-center!">
            <MapPin size={14} /><span>{chapter.location.label}</span>
          </div>
        )}
      </motion.div>
    </motion.article>
  );
}

// ─── LAYOUT: FULLBLEED (cinematic full-width photo with text overlay) ───
function FullbleedLayout({ chapter }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const mainImage = chapter.images[0]?.url || '';

  return (
    <motion.article ref={ref} style={{ position: 'relative', height: '85vh', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}>
      <motion.div style={{ position: 'absolute', inset: -20, y }}>
        <img src={proxyUrl(mainImage, 1920, 1080)} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6) contrast(1.1)' }} />
      </motion.div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)' }} />
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '4rem 2rem', maxWidth: '700px', color: '#ffffff' }}>
        <span style={{ fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7, display: 'block', marginBottom: '1.5rem' }}>{formatDate(chapter.date)}</span>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 400, lineHeight: 1.1, margin: '0 0 1rem 0' }}>{chapter.title}</h3>
        <p style={{ fontStyle: 'italic', opacity: 0.8, fontSize: '1.1rem', marginBottom: '1.5rem', fontFamily: 'var(--eg-font-heading)' }}>{chapter.subtitle}</p>
        <p style={{ lineHeight: 1.8, fontSize: '0.95rem', opacity: 0.9 }}>{chapter.description}</p>
        {chapter.location && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1.5rem', opacity: 0.7, fontSize: '0.85rem' }}>
            <MapPin size={14} /><span>{chapter.location.label}</span>
          </div>
        )}
      </div>
    </motion.article>
  );
}

// ─── LAYOUT: CINEMATIC (quote-style with large italic text) ───
function CinematicLayout({ chapter }: TimelineItemProps) {
  return (
    <motion.article style={{ padding: '8rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
      <span style={{ fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--eg-accent)', display: 'block', marginBottom: '2rem' }}>{formatDate(chapter.date)}</span>
      <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 400, fontStyle: 'italic', color: 'var(--eg-fg)', lineHeight: 1.2, margin: '0 0 2rem 0' }}>
        &ldquo;{chapter.title}&rdquo;
      </h3>
      <div style={{ width: '60px', height: '1px', background: 'var(--eg-accent)', margin: '0 auto 2rem' }} />
      <p style={{ fontSize: '1.15rem', lineHeight: 1.9, color: 'var(--eg-fg)', fontFamily: 'var(--eg-font-body)', fontWeight: 300 }}>{chapter.description}</p>
      <p style={{ fontStyle: 'italic', color: 'var(--eg-accent)', fontSize: '0.95rem', marginTop: '2rem' }}>{chapter.subtitle}</p>
      {chapter.location && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1.5rem', color: 'var(--eg-muted)', fontSize: '0.85rem' }}>
          <MapPin size={14} /><span>{chapter.location.label}</span>
        </div>
      )}
    </motion.article>
  );
}

// ─── LAYOUT: SPLIT (card with photo left, text right in a contained card) ───
function SplitLayout({ chapter, index }: TimelineItemProps) {
  const isEven = index % 2 === 0;
  const mainImage = chapter.images[0]?.url || '';

  return (
    <motion.article style={{
      display: 'flex', flexDirection: isEven ? 'row' : 'row-reverse', maxWidth: '1100px', margin: '0 auto',
      background: 'var(--eg-card-bg)', borderRadius: 'var(--eg-radius)', overflow: 'hidden',
      boxShadow: 'var(--eg-card-shadow)', border: 'var(--eg-card-border)', backdropFilter: 'blur(10px)'
    }} className="max-md:flex-col!"
      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
      <div style={{ flex: '0 0 50%', minHeight: '400px', position: 'relative' }} className="max-md:min-h-[250px]!">
        <img src={proxyUrl(mainImage, 1200, 800)} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
      </div>
      <div style={{ flex: 1, padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--eg-accent)', fontWeight: 600, marginBottom: '1rem' }}>{formatDate(chapter.date)}</span>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.8rem', fontWeight: 400, color: 'var(--eg-fg)', lineHeight: 1.2, margin: '0 0 0.75rem 0' }}>{chapter.title}</h3>
        <p style={{ fontStyle: 'italic', color: 'var(--eg-accent)', fontSize: '0.95rem', marginBottom: '1.25rem', fontFamily: 'var(--eg-font-heading)' }}>{chapter.subtitle}</p>
        <p style={{ color: 'var(--eg-muted)', lineHeight: 1.8, fontSize: '0.9rem' }}>{chapter.description}</p>
        {chapter.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.5rem', color: 'var(--eg-accent)', fontSize: '0.8rem' }}>
            <MapPin size={14} /><span>{chapter.location.label}</span>
          </div>
        )}
      </div>
    </motion.article>
  );
}

// ─── LAYOUT: GALLERY (multi-image grid with text below) ───
function GalleryLayout({ chapter }: TimelineItemProps) {
  const images = chapter.images.slice(0, 3);
  
  return (
    <motion.article style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}
      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: images.length >= 3 ? '2fr 1fr' : images.length === 2 ? '1fr 1fr' : '1fr',
        gridTemplateRows: images.length >= 3 ? '1fr 1fr' : '1fr',
        gap: '0.5rem', borderRadius: 'var(--eg-radius)', overflow: 'hidden', aspectRatio: '16/9',
      }}>
        {images[0] && (
          <div style={{ gridRow: images.length >= 3 ? '1 / -1' : '1', position: 'relative' }}>
            <img src={proxyUrl(images[0].url, 1200, 800)} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          </div>
        )}
        {images[1] && (
          <div style={{ position: 'relative' }}>
            <img src={proxyUrl(images[1].url, 600, 400)} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          </div>
        )}
        {images[2] && (
          <div style={{ position: 'relative' }}>
            <img src={proxyUrl(images[2].url, 600, 400)} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', padding: '3rem 1rem 0' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--eg-accent)', fontWeight: 600, display: 'block', marginBottom: '1rem' }}>{formatDate(chapter.date)}</span>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 400, color: 'var(--eg-fg)', lineHeight: 1.2, margin: '0 0 0.75rem 0' }}>{chapter.title}</h3>
        <p style={{ fontStyle: 'italic', color: 'var(--eg-accent)', fontSize: '0.95rem', marginBottom: '1rem', fontFamily: 'var(--eg-font-heading)' }}>{chapter.subtitle}</p>
        <p style={{ color: 'var(--eg-muted)', lineHeight: 1.8, fontSize: '0.9rem', maxWidth: '600px', margin: '0 auto' }}>{chapter.description}</p>
        {chapter.location && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1.5rem', color: 'var(--eg-accent)', fontSize: '0.85rem' }}>
            <MapPin size={14} /><span>{chapter.location.label}</span>
          </div>
        )}
      </div>
    </motion.article>
  );
}

// ─── MAIN ROUTER ───
const LAYOUT_CYCLE: Array<Chapter['layout']> = ['editorial', 'fullbleed', 'split', 'cinematic', 'gallery'];

export function TimelineItem({ chapter, index }: TimelineItemProps) {
  // Use the AI-assigned layout, or cycle through layouts if none specified
  const layout = chapter.layout || LAYOUT_CYCLE[index % LAYOUT_CYCLE.length];

  switch (layout) {
    case 'fullbleed': return <FullbleedLayout chapter={chapter} index={index} />;
    case 'split': return <SplitLayout chapter={chapter} index={index} />;
    case 'cinematic': return <CinematicLayout chapter={chapter} index={index} />;
    case 'gallery': return <GalleryLayout chapter={chapter} index={index} />;
    case 'editorial':
    default: return <EditorialLayout chapter={chapter} index={index} />;
  }
}
