'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/timeline-item.tsx
// High-Fidelity Editorial Chapter Layout
// ─────────────────────────────────────────────────────────────

import { useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import type { Chapter } from '@/types';

interface TimelineItemProps {
  chapter: Chapter;
  index: number;
}

export function TimelineItem({ chapter, index }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isEven = index % 2 === 0;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['0 1.2', '1 0.8'],
  });

  const imgY = useTransform(scrollYProgress, [0, 1], ['5%', '-5%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['15%', '-15%']);

  const hasImage = chapter.images.length > 0;
  const rawImageUrl = hasImage ? chapter.images[0].url : '';
  // Google Picker API baseUrls need the authenticated proxy; Supabase/local URLs work directly
  const mainImage = rawImageUrl.includes('googleusercontent.com')
    ? `/api/photos/proxy?url=${encodeURIComponent(rawImageUrl)}&w=1200&h=1600`
    : rawImageUrl;

  return (
    <motion.article
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: isEven ? 'row' : 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4rem',
        padding: '0 2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        minHeight: '60vh',
      }}
      className="max-md:flex-col! max-md:gap-0" // tailwind fallback for mobile stacking
    >
      {/* Editorial Image Block */}
      {hasImage && (
        <motion.div
          style={{
            flex: '1 1 50%',
            position: 'relative',
            aspectRatio: '3/4',
            overflow: 'hidden',
            borderRadius: '0.25rem', // Slight soft edge, highly cinematic
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          }}
          className="max-md:w-full! max-md:aspect-[4/5]!"
        >
          <motion.img
            src={mainImage}
            alt={chapter.title}
            style={{
              width: '100%',
              height: '110%', // overscroll allowed for parallax
              objectFit: 'cover',
              y: imgY,
            }}
            loading="lazy"
          />
        </motion.div>
      )}

      {/* Editorial Typography Block */}
      <motion.div
        style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: isEven ? 'flex-start' : 'flex-end',
          textAlign: isEven ? 'left' : 'right',
          padding: '4rem',
          y: textY,
          position: 'relative',
          zIndex: 10,
          background: 'rgba(250, 249, 246, 0.95)', // slight glass frosted effect
          backdropFilter: 'blur(10px)',
          margin: isEven ? '0 0 0 -8rem' : '0 -8rem 0 0', // overlap the image
        }}
        className="max-md:m-[-3rem_1rem_0_1rem]! max-md:p-8! max-md:text-center! max-md:items-center!"
      >
        <span style={{ 
          fontSize: '0.8rem', 
          letterSpacing: '0.2em', 
          color: 'var(--eg-accent)',
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
          display: 'block'
        }}>
          {formatDate(chapter.date)}
        </span>

        <h3 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          fontWeight: 400,
          color: 'var(--eg-fg)',
          lineHeight: 1.1,
          marginBottom: '1.5rem',
          letterSpacing: '-0.02em',
        }}>
          {chapter.title}
        </h3>

        {/* Decorative separator */}
        <div style={{ width: '40px', height: '1px', background: 'var(--eg-accent)', margin: isEven ? '0 0 1.5rem 0' : '0 0 1.5rem auto' }} className="max-md:mx-auto!" />

        <p style={{
          fontFamily: 'var(--eg-font-body)',
          fontSize: '1.05rem',
          fontWeight: 300,
          color: 'var(--eg-muted)',
          lineHeight: 1.8,
          marginBottom: '2rem',
          maxWidth: '500px'
        }}>
          {chapter.description}
        </p>

        {chapter.location && (
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            fontSize: '0.85rem',
            color: 'var(--eg-fg)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            <MapPin size={14} style={{ opacity: 0.5 }} />
            {chapter.location.label}
          </div>
        )}
      </motion.div>
    </motion.article>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
