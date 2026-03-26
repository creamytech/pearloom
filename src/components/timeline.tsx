'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/timeline.tsx
// Dynamic Story Showcase — uses AI theme + varied layouts
// ─────────────────────────────────────────────────────────────

import { TimelineItem } from './timeline-item';
import type { Chapter } from '@/types';

interface TimelineProps {
  chapters: Chapter[];
  coupleNames?: [string, string];
  sectionTitle?: string;
  sectionSubtitle?: string;
}

export function Timeline({ chapters, coupleNames, sectionTitle, sectionSubtitle }: TimelineProps) {
  if (!chapters.length) return null;

  const title = sectionTitle || (coupleNames
    ? `${coupleNames[0]} & ${coupleNames[1]}`
    : 'Our Story');

  const subtitle = sectionSubtitle || 'The moments that made us, us.';

  return (
    <section style={{ background: 'var(--eg-bg)', padding: '8rem 0', position: 'relative' }}>
      {/* Background grain texture */}
      <div 
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.15, pointerEvents: 'none', mixBlendMode: 'multiply'
        }}
      />

      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '8rem', padding: '0 2rem' }}>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 400, color: 'var(--eg-fg)',
            letterSpacing: '-0.01em', margin: '0 0 1rem 0'
          }}>
            {title}
          </h2>
          <div style={{ width: '40px', height: '1px', background: 'var(--eg-accent)', margin: '0 auto 1.5rem auto' }} />
          <p style={{
            fontFamily: 'var(--eg-font-body)', fontSize: '1rem',
            color: 'var(--eg-muted)', letterSpacing: '0.05em',
            fontStyle: 'italic'
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
