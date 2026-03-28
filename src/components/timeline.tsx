'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/timeline.tsx
// Dynamic Story Showcase — uses AI theme + varied layouts
// ─────────────────────────────────────────────────────────────

import { TimelineItem } from './timeline-item';
import { useTheme } from '@/components/theme-provider';
import { getPatternStyle } from '@/lib/patterns';
import type { Chapter } from '@/types';

interface TimelineProps {
  chapters: Chapter[];
  coupleNames?: [string, string];
  sectionTitle?: string;
  sectionSubtitle?: string;
}
export function Timeline({ chapters, coupleNames, sectionTitle, sectionSubtitle }: TimelineProps) {
  const { theme } = useTheme();

  if (!chapters.length) return null;

  const title = sectionTitle || (coupleNames
    ? `${coupleNames[0]} & ${coupleNames[1]}`
    : 'Our Story');

  const subtitle = sectionSubtitle || 'The moments that made us, us.';

  return (
    <section style={{ background: 'var(--eg-bg)', padding: '8rem 0', position: 'relative' }}>
      {/* Dynamic Background Pattern */}
      <div 
        style={{
          position: 'absolute', inset: 0,
          ...getPatternStyle(theme.backgroundPattern)
        }}
      />

      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '9rem', padding: '0 2rem' }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <div style={{ width: '60px', height: '1px', background: 'var(--eg-accent)', opacity: 0.3 }} />
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--eg-accent)', fontWeight: 700, opacity: 0.8 }}>Our Journey</span>
            <div style={{ width: '60px', height: '1px', background: 'var(--eg-accent)', opacity: 0.3 }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
            fontWeight: 400, color: 'var(--eg-fg)',
            letterSpacing: '-0.025em', margin: '0 0 2rem 0',
            lineHeight: 1.05,
          }}>
            {title}
          </h2>
          {/* Ornamental rule */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            <div style={{ width: '28px', height: '1px', background: 'var(--eg-accent)', opacity: 0.4 }} />
            <div style={{ width: '4px', height: '4px', background: 'var(--eg-accent)', transform: 'rotate(45deg)', opacity: 0.6 }} />
            <div style={{ width: '28px', height: '1px', background: 'var(--eg-accent)', opacity: 0.4 }} />
          </div>
          <p style={{
            fontFamily: 'var(--eg-font-body)', fontSize: '1.05rem',
            color: 'var(--eg-muted)', letterSpacing: '0.04em',
            fontStyle: 'italic', lineHeight: 1.7,
          }}>
            {subtitle}
          </p>
        </div>

        {/* Dynamic Chapters — each has its own layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6rem' }}>
          {chapters.map((chapter, i) => (
            <TimelineItem key={chapter.id} chapter={chapter} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
