'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/timeline.tsx
// Dynamic Story Showcase — macro layout switcher
// Layouts: cascade | filmstrip | scrapbook | magazine | chapters | starmap
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimelineItem } from './timeline-item';
import { useTheme } from '@/components/theme-provider';
import { getPatternStyle } from '@/lib/patterns';
import type { Chapter } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';

interface TimelineProps {
  chapters: Chapter[];
  coupleNames?: [string, string];
  sectionTitle?: string;
  sectionSubtitle?: string;
  vibeSkin?: VibeSkin;
  layoutFormat?: string;
}

// ── Section header shared across all layouts ──────────────────
function SectionHeader({ title, subtitle, eyebrowLabel }: { title: string; subtitle: string; eyebrowLabel: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '5rem', padding: '0 2rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.8 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}
      >
        <div style={{ width: '60px', height: '1px', background: 'var(--eg-accent)', opacity: 0.3 }} />
        <span style={{ fontSize: '0.62rem', letterSpacing: '0.32em', textTransform: 'uppercase', fontVariant: 'small-caps', color: 'var(--eg-accent)', fontWeight: 700, opacity: 0.85 }}>
          {eyebrowLabel}
        </span>
        <div style={{ width: '60px', height: '1px', background: 'var(--eg-accent)', opacity: 0.3 }} />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(2.25rem, 5.5vw, 3.75rem)', fontWeight: 600, fontStyle: 'italic', color: 'var(--eg-fg)', letterSpacing: '-0.03em', margin: '0 0 2rem 0', lineHeight: 1.05 }}
      >
        {title}
      </motion.h2>
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        whileInView={{ opacity: 1, scaleX: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.9, delay: 0.25 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}
      >
        <div style={{ width: '28px', height: '1px', background: 'var(--eg-accent)', opacity: 0.4 }} />
        <div style={{ width: '4px', height: '4px', background: 'var(--eg-accent)', transform: 'rotate(45deg)', opacity: 0.6 }} />
        <div style={{ width: '28px', height: '1px', background: 'var(--eg-accent)', opacity: 0.4 }} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.9, delay: 0.3 }}
        style={{ fontFamily: 'var(--eg-font-body)', fontSize: '1.05rem', color: 'var(--eg-muted)', letterSpacing: '0.04em', fontStyle: 'italic', lineHeight: 1.7 }}
      >
        {subtitle}
      </motion.p>
    </div>
  );
}

// ── CASCADE — classic editorial vertical scroll (default) ──────
function CascadeLayout({ chapters, vibeSkin }: { chapters: Chapter[]; vibeSkin?: VibeSkin }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {chapters.map((chapter, i) => (
        <div key={chapter.id}>
          {i > 0 && <div style={{ height: '1px', background: 'var(--eg-divider, rgba(0,0,0,0.07))', margin: '0 clamp(0.5rem, 4vw, 2rem)' }} />}
          <div style={{ background: i % 2 === 0 ? 'var(--eg-bg)' : 'var(--eg-bg-section)', paddingTop: '5rem', paddingBottom: '5rem', position: 'relative' }}>
            {(chapter.ambientColor || vibeSkin?.chapterColors?.[i]) && (
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: chapter.ambientColor || vibeSkin?.chapterColors?.[i], opacity: 0.045 }} />
            )}
            <TimelineItem chapter={chapter} index={i} chapterIcon={vibeSkin?.chapterIcons?.[i]} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── FILM STRIP — horizontal scrolling 35mm reel ───────────────
function FilmStripLayout({ chapters, vibeSkin }: { chapters: Chapter[]; vibeSkin?: VibeSkin }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <div>
      {/* Film reel strip */}
      <div style={{ position: 'relative', overflowX: 'auto', overflowY: 'visible', paddingBottom: '1rem', WebkitOverflowScrolling: 'touch' as unknown as undefined }}>
        {/* Film perforations — top */}
        <div style={{ position: 'sticky', left: 0, display: 'flex', gap: 0, background: '#1a1713', padding: '8px 24px', minWidth: 'max-content' }}>
          {chapters.map((_, i) => (
            <div key={i} style={{ width: '20px', height: '14px', marginRight: '80px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }} />
          ))}
        </div>

        {/* Frames */}
        <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 16px)', padding: '0 24px', background: '#1a1713', minWidth: 'max-content' }}>
          {chapters.map((chapter, i) => {
            const coverImg = chapter.images?.[chapter.heroPhotoIndex ?? 0]?.url || chapter.images?.[0]?.url;
            const isActive = activeIdx === i;
            return (
              <motion.div
                key={chapter.id}
                onClick={() => setActiveIdx(isActive ? null : i)}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  width: 'clamp(150px, 30vw, 220px)', flexShrink: 0, cursor: 'pointer',
                  background: isActive ? 'rgba(163,177,138,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${isActive ? 'rgba(163,177,138,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '2px',
                  overflow: 'hidden',
                  boxShadow: isActive ? '0 20px 60px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0,0,0,0.4)',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                {/* Photo frame */}
                <div style={{ position: 'relative', width: '100%', paddingBottom: '72%', background: '#111', overflow: 'hidden' }}>
                  {coverImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImg} alt={chapter.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: isActive ? 'none' : 'brightness(0.7) saturate(0.85)', transition: 'filter 0.4s' }} />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${vibeSkin?.chapterColors?.[i] || 'rgba(163,177,138,0.3)'}, rgba(0,0,0,0.5))` }} />
                  )}
                  {/* Frame number */}
                  <div style={{ position: 'absolute', top: '8px', left: '10px', fontFamily: 'monospace', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>
                    {String(i + 1).padStart(2, '0')} ▸
                  </div>
                  {/* Mood badge */}
                  {chapter.mood && (
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '100px', backdropFilter: 'blur(4px)' }}>
                      {chapter.mood}
                    </div>
                  )}
                </div>

                {/* Caption */}
                <div style={{ padding: '12px 14px 14px' }}>
                  <div style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '0.85rem', fontWeight: 600, color: isActive ? '#A3B18A' : 'rgba(255,255,255,0.75)', marginBottom: '4px', lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{chapter.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{chapter.subtitle}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Film perforations — bottom */}
        <div style={{ display: 'flex', gap: 0, background: '#1a1713', padding: '8px 24px', minWidth: 'max-content' }}>
          {chapters.map((_, i) => (
            <div key={i} style={{ width: '20px', height: '14px', marginRight: '80px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }} />
          ))}
        </div>
      </div>

      {/* Expanded chapter detail */}
      <AnimatePresence>
        {activeIdx !== null && (
          <motion.div
            key={`film-detail-${activeIdx}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ background: 'var(--eg-bg)', paddingTop: '4rem', paddingBottom: '4rem' }}>
              <TimelineItem chapter={chapters[activeIdx]} index={activeIdx} chapterIcon={vibeSkin?.chapterIcons?.[activeIdx]} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SCRAPBOOK — polaroids scattered on a linen board ──────────
function ScrapbookLayout({ chapters, vibeSkin }: { chapters: Chapter[]; vibeSkin?: VibeSkin }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  // Deterministic rotation/position offsets per card
  const offsets = chapters.map((_, i) => ({
    rotate: ((i * 37 + 7) % 18) - 9, // -9 to +9 degrees
    tx: ((i * 53 + 11) % 30) - 15,   // -15 to +15 px
    ty: ((i * 29 + 3) % 20) - 10,    // -10 to +10 px
  }));

  return (
    <div>
      <div style={{
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 32px)',
        padding: '3rem 2rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', alignItems: 'flex-start' }}>
          {chapters.map((chapter, i) => {
            const coverImg = chapter.images?.[chapter.heroPhotoIndex ?? 0]?.url || chapter.images?.[0]?.url;
            const { rotate, tx, ty } = offsets[i];
            const isActive = activeIdx === i;

            return (
              <motion.div
                key={chapter.id}
                onClick={() => setActiveIdx(isActive ? null : i)}
                initial={{ opacity: 0, scale: 0.85, rotate: rotate - 5 }}
                whileInView={{ opacity: 1, scale: 1, rotate: isActive ? 0 : rotate }}
                whileHover={{ scale: 1.06, rotate: 0, zIndex: 20 }}
                whileTap={{ scale: 0.98 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  width: 'clamp(160px, 80vw, 220px)',
                  background: '#faf9f6',
                  padding: '12px 12px 48px',
                  boxShadow: isActive
                    ? '0 30px 80px rgba(0,0,0,0.25), 0 0 0 3px rgba(163,177,138,0.5)'
                    : '0 8px 30px rgba(0,0,0,0.18)',
                  cursor: 'pointer',
                  transform: `translate(${tx}px, ${ty}px)`,
                  position: 'relative',
                  zIndex: isActive ? 30 : 1,
                }}
              >
                {/* Photo */}
                <div style={{ width: '100%', paddingBottom: '100%', position: 'relative', background: '#eee', overflow: 'hidden', marginBottom: '8px' }}>
                  {coverImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImg} alt={chapter.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${vibeSkin?.chapterColors?.[i] || 'rgba(163,177,138,0.4)'}, rgba(163,177,138,0.1))` }} />
                  )}
                  {/* Chapter icon */}
                  {vibeSkin?.chapterIcons?.[i] && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '1.2rem' }}>{vibeSkin.chapterIcons[i]}</div>
                  )}
                </div>

                {/* Caption strip */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '0.85rem', fontStyle: 'italic', color: '#1a1713', lineHeight: 1.4 }}>{chapter.title}</div>
                  {chapter.date && (
                    <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '4px', fontFamily: 'Georgia, serif' }}>
                      {new Date(chapter.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>

                {/* Tape strip decorations */}
                <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', width: '48px', height: '16px', background: 'rgba(214,198,168,0.6)', borderRadius: '2px', backdropFilter: 'blur(2px)' }} />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {activeIdx !== null && (
          <motion.div
            key={`scrap-detail-${activeIdx}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: 'var(--eg-bg)', padding: '4rem 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}
          >
            <TimelineItem chapter={chapters[activeIdx]} index={activeIdx} chapterIcon={vibeSkin?.chapterIcons?.[activeIdx]} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MAGAZINE — editorial full-bleed spreads ───────────────────
function MagazineLayout({ chapters, vibeSkin }: { chapters: Chapter[]; vibeSkin?: VibeSkin }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {chapters.map((chapter, i) => {
        const coverImg = chapter.images?.[chapter.heroPhotoIndex ?? 0]?.url || chapter.images?.[0]?.url;
        const isEven = i % 2 === 0;

        return (
          <div key={chapter.id}>
            {/* Full-bleed cover image */}
            {coverImg && (
              <motion.div
                initial={{ opacity: 0, scale: 1.04 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ position: 'relative', height: 'clamp(360px, 55vw, 640px)', overflow: 'hidden' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImg} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: isEven ? 'linear-gradient(to right, rgba(0,0,0,0.65) 40%, transparent)' : 'linear-gradient(to left, rgba(0,0,0,0.65) 40%, transparent)' }} />

                {/* Overlay headline */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(1rem, 4vw, 3rem)', maxWidth: isEven ? 'min(55%, 90vw)' : undefined, marginLeft: isEven ? 0 : 'auto' }}>
                  <motion.div
                    initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
                      {String(i + 1).padStart(2, '0')} — {chapter.mood || 'Chapter'}
                    </div>
                    <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 400, color: '#fff', lineHeight: 1.1, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                      {chapter.title}
                    </h2>
                    <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: '36ch' }}>
                      {chapter.subtitle}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Editorial text body */}
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ fontFamily: 'var(--eg-font-body)', fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'var(--eg-fg)', lineHeight: 1.85, letterSpacing: '0.01em', maxWidth: '65ch', margin: '0 auto' }}
              >
                {chapter.description}
              </motion.p>

              {/* Gallery row if multiple images */}
              {chapter.images.length > 1 && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2.5rem', overflowX: 'auto' }}>
                  {chapter.images.slice(1, 5).map((img, j) => (
                    <div key={img.id} style={{ width: '160px', height: '120px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `saturate(${0.9 + j * 0.05})` }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CHAPTERS — accordion book-page reveal ─────────────────────
function ChaptersLayout({ chapters, vibeSkin }: { chapters: Chapter[]; vibeSkin?: VibeSkin }) {
  const [openIdx, setOpenIdx] = useState<number>(0);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem' }}>
      {chapters.map((chapter, i) => {
        const isOpen = openIdx === i;
        const coverImg = chapter.images?.[chapter.heroPhotoIndex ?? 0]?.url || chapter.images?.[0]?.url;

        return (
          <div key={chapter.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            {/* Chapter header — always visible */}
            <motion.button
              onClick={() => setOpenIdx(isOpen ? -1 : i)}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.15 }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '1.5rem',
                padding: '2.25rem 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              {/* Chapter number */}
              <span style={{
                fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 300, color: isOpen ? 'var(--eg-accent, #A3B18A)' : 'rgba(0,0,0,0.15)',
                lineHeight: 1, minWidth: '2.5rem', transition: 'color 0.3s',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: isOpen ? 'var(--eg-accent, #A3B18A)' : 'var(--eg-muted)', marginBottom: '0.4rem', transition: 'color 0.3s' }}>
                  {chapter.mood || 'Chapter'}
                </div>
                <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 400, color: 'var(--eg-fg)', lineHeight: 1.2, margin: 0, letterSpacing: '-0.01em' }}>
                  {chapter.title}
                </h3>
              </div>

              {/* Thumbnail peek */}
              {coverImg && (
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, opacity: isOpen ? 1 : 0.5, transition: 'opacity 0.3s', border: `2px solid ${isOpen ? 'var(--eg-accent, #A3B18A)' : 'transparent'}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImg} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {/* Chevron */}
              <motion.span
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={{ duration: 0.25 }}
                style={{ fontSize: '1.2rem', color: 'var(--eg-muted)', flexShrink: 0 }}
              >
                ›
              </motion.span>
            </motion.button>

            {/* Expanded chapter content */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key={`chap-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ paddingBottom: '4rem' }}>
                    <TimelineItem chapter={chapter} index={i} chapterIcon={vibeSkin?.chapterIcons?.[i]} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── STARMAP — constellation on a night sky ────────────────────
function StarmapLayout({ chapters, vibeSkin }: { chapters: Chapter[]; vibeSkin?: VibeSkin }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // Positions: arc across the canvas for a constellation feel
  const starPositions = chapters.map((_, i) => {
    const t = i / Math.max(chapters.length - 1, 1);
    // Gentle sinusoidal arc
    return {
      x: 8 + t * 82,  // 8% to 90% horizontally
      y: 25 + Math.sin(t * Math.PI) * 35 + (i % 2) * 12, // sinusoidal arc
    };
  });

  return (
    <div>
      {/* Star canvas */}
      <div style={{ position: 'relative', background: 'linear-gradient(180deg, #0a0e1a 0%, #0d1b2a 60%, #1b2a1f 100%)', minHeight: '420px', overflow: 'hidden', padding: '3rem 0' }}>
        {/* Twinkling background stars */}
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={`bg-star-${i}`}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2 + (i % 5), repeat: Infinity, delay: (i * 0.3) % 4 }}
            style={{
              position: 'absolute',
              left: `${(i * 23 + 7) % 96}%`,
              top: `${(i * 17 + 13) % 88}%`,
              width: `${1 + (i % 2)}px`,
              height: `${1 + (i % 2)}px`,
              borderRadius: '50%',
              background: '#fff',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Constellation lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {starPositions.slice(0, -1).map((pos, i) => (
            <motion.line
              key={`line-${i}`}
              x1={`${pos.x}%`} y1={`${pos.y}%`}
              x2={`${starPositions[i + 1].x}%`} y2={`${starPositions[i + 1].y}%`}
              stroke="rgba(200,220,255,0.2)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: i * 0.2, ease: 'easeOut' }}
            />
          ))}
        </svg>

        {/* Chapter stars */}
        {chapters.map((chapter, i) => {
          const { x, y } = starPositions[i];
          const isActive = activeIdx === i;
          const coverImg = chapter.images?.[0]?.url;

          return (
            <motion.div
              key={chapter.id}
              onClick={() => setActiveIdx(isActive ? null : i)}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', zIndex: isActive ? 20 : 10, cursor: 'pointer' }}
            >
              {/* Glow ring */}
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                style={{ position: 'absolute', inset: '-12px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(163,177,138,0.4), transparent 70%)' }}
              />

              {/* Star orb */}
              <motion.div
                whileHover={{ scale: 1.4 }}
                style={{
                  width: isActive ? '64px' : '40px',
                  height: isActive ? '64px' : '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `2px solid ${isActive ? '#A3B18A' : 'rgba(200,220,255,0.4)'}`,
                  boxShadow: isActive ? '0 0 24px rgba(163,177,138,0.6)' : '0 0 10px rgba(200,220,255,0.2)',
                  transition: 'all 0.3s',
                }}
              >
                {coverImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImg} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: vibeSkin?.chapterColors?.[i] || 'rgba(163,177,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1rem' }}>{vibeSkin?.chapterIcons?.[i] || '★'}</span>
                  </div>
                )}
              </motion.div>

              {/* Star label */}
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '0.85rem', fontStyle: 'italic', color: isActive ? '#A3B18A' : 'rgba(220,235,255,0.88)', lineHeight: 1.3 }}>
                  {chapter.title}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Expanded chapter detail */}
      <AnimatePresence>
        {activeIdx !== null && (
          <motion.div
            key={`star-detail-${activeIdx}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: 'var(--eg-bg)', padding: '4rem 0', borderTop: '2px solid rgba(163,177,138,0.2)' }}
          >
            <TimelineItem chapter={chapters[activeIdx]} index={activeIdx} chapterIcon={vibeSkin?.chapterIcons?.[activeIdx]} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function Timeline({ chapters, coupleNames, sectionTitle, sectionSubtitle, vibeSkin, layoutFormat = 'cascade' }: TimelineProps) {
  const { theme } = useTheme();

  if (!chapters.length) return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 2rem',
      color: 'var(--eg-muted, rgba(0,0,0,0.4))',
      fontFamily: 'var(--eg-font-heading, Georgia, serif)',
      fontStyle: 'italic',
      fontSize: '1.1rem',
    }}>
      The couple hasn&apos;t shared their story yet — check back soon.
    </div>
  );

  const title = sectionTitle || (coupleNames
    ? `${coupleNames[0]} & ${coupleNames[1]}`
    : 'Our Story');

  const subtitle = sectionSubtitle || 'The moments that made us, us.';
  const eyebrowLabel = (vibeSkin as VibeSkin & { sectionLabels?: { timeline?: string } })?.sectionLabels?.timeline || 'Our Story';

  const renderLayout = () => {
    switch (layoutFormat) {
      case 'filmstrip':
        return <FilmStripLayout chapters={chapters} vibeSkin={vibeSkin} />;
      case 'scrapbook':
        return <ScrapbookLayout chapters={chapters} vibeSkin={vibeSkin} />;
      case 'magazine':
        return <MagazineLayout chapters={chapters} vibeSkin={vibeSkin} />;
      case 'chapters':
        return <ChaptersLayout chapters={chapters} vibeSkin={vibeSkin} />;
      case 'starmap':
        return <StarmapLayout chapters={chapters} vibeSkin={vibeSkin} />;
      default:
        return <CascadeLayout chapters={chapters} vibeSkin={vibeSkin} />;
    }
  };

  return (
    <section style={{ background: 'var(--eg-bg)', position: 'relative' }}>
      <div style={{ padding: '2rem 0 8rem', position: 'relative' }}>
        {/* Dynamic Background Pattern */}
        {layoutFormat === 'cascade' || !layoutFormat ? (
          <div style={{ position: 'absolute', inset: 0, ...getPatternStyle(theme.backgroundPattern) }} />
        ) : null}

        <div style={{ maxWidth: layoutFormat === 'filmstrip' ? '100%' : '1400px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <SectionHeader title={title} subtitle={subtitle} eyebrowLabel={eyebrowLabel} />
          {renderLayout()}
        </div>
      </div>
    </section>
  );
}
