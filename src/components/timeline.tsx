'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/timeline.tsx
// Dynamic Story Showcase — editorial section with wave divider
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
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
}

export function Timeline({ chapters, coupleNames, sectionTitle, sectionSubtitle, vibeSkin }: TimelineProps) {
  const { theme } = useTheme();

  if (!chapters.length) return null;

  const title = sectionTitle || (coupleNames
    ? `${coupleNames[0]} & ${coupleNames[1]}`
    : 'Our Story');

  const subtitle = sectionSubtitle || 'The moments that made us, us.';

  // Section eyebrow label — use vibeSkin if available
  const eyebrowLabel = (vibeSkin as VibeSkin & { sectionLabels?: { timeline?: string } })?.sectionLabels?.timeline || 'Our Story';

  return (
    <section style={{ background: 'var(--eg-bg)', position: 'relative' }}>
      <div style={{ padding: '2rem 0 8rem', position: 'relative' }}>
        {/* Dynamic Background Pattern */}
        <div
          style={{
            position: 'absolute', inset: 0,
            ...getPatternStyle(theme.backgroundPattern),
          }}
        />

        <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '5rem', padding: '0 2rem' }}>

            {/* Eyebrow — small caps, olive, generous letter-spacing */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '1rem', marginBottom: '2.5rem',
              }}
            >
              <div style={{ width: '60px', height: '1px', background: 'var(--eg-accent)', opacity: 0.3 }} />
              <span style={{
                fontSize: '0.62rem',
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                fontVariant: 'small-caps',
                color: 'var(--eg-accent)',
                fontWeight: 700,
                opacity: 0.85,
              }}>
                {eyebrowLabel}
              </span>
              <div style={{ width: '60px', height: '1px', background: 'var(--eg-accent)', opacity: 0.3 }} />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: 'var(--eg-font-heading)',
                fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
                fontWeight: 400,
                color: 'var(--eg-fg)',
                letterSpacing: '-0.025em',
                margin: '0 0 2rem 0',
                lineHeight: 1.05,
              }}
            >
              {title}
            </motion.h2>

            {/* Ornamental rule */}
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
              style={{
                fontFamily: 'var(--eg-font-body)',
                fontSize: '1.05rem',
                color: 'var(--eg-muted)',
                letterSpacing: '0.04em',
                fontStyle: 'italic',
                lineHeight: 1.7,
              }}
            >
              {subtitle}
            </motion.p>
          </div>

          {/* Dynamic Chapters — alternating section backgrounds, each with its own layout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {chapters.map((chapter, i) => (
              <div key={chapter.id}>
                {i > 0 && (
                  <div style={{ height: '1px', background: 'var(--eg-divider, rgba(0,0,0,0.07))', margin: '0 2rem' }} />
                )}
                <div
                  style={{
                    background: i % 2 === 0 ? 'var(--eg-bg)' : 'var(--eg-bg-section)',
                    paddingTop: '5rem',
                    paddingBottom: '5rem',
                    position: 'relative',
                  }}
                >
                  <TimelineItem
                    chapter={chapter}
                    index={i}
                    chapterIcon={vibeSkin?.chapterIcons?.[i]}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
