'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/timeline.tsx
// High-Fidelity Editorial Story Showcase
// ─────────────────────────────────────────────────────────────

import { TimelineItem } from './timeline-item';
import type { Chapter } from '@/types';

interface TimelineProps {
  chapters: Chapter[];
}

export function Timeline({ chapters }: TimelineProps) {
  if (!chapters.length) return null;

  return (
    <section style={{ background: '#faf9f6', padding: '8rem 0', position: 'relative' }}>
      {/* Background grain texture */}
      <div 
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.25, pointerEvents: 'none', mixBlendMode: 'multiply'
        }}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* Editorial Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '8rem', padding: '0 2rem' }}>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 400,
            color: 'var(--eg-fg)',
            letterSpacing: '-0em',
            margin: '0 0 1rem 0'
          }}>
            Our Journey
          </h2>
          <div style={{ width: '40px', height: '1px', background: 'var(--eg-accent)', margin: '0 auto 1.5rem auto' }} />
          <p style={{
            fontFamily: 'var(--eg-font-body)',
            fontSize: '1rem',
            color: 'var(--eg-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            Every moment that led to forever
          </p>
        </div>

        {/* Editorial Chapters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8rem' }}>
          {chapters.map((chapter, i) => (
            <TimelineItem key={chapter.id} chapter={chapter} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
