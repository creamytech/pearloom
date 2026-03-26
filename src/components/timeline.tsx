'use client';

// ─────────────────────────────────────────────────────────────
// everglow / components/timeline.tsx
// The smart timeline container with vertical spine
// ─────────────────────────────────────────────────────────────

import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { TimelineItem } from './timeline-item';
import type { Chapter } from '@/types';

interface TimelineProps {
  chapters: Chapter[];
}

export function Timeline({ chapters }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Spring-smoothed progress for the glowing timeline spine
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const spineHeight = useTransform(smoothProgress, [0, 1], ['0%', '100%']);

  if (!chapters.length) return null;

  return (
    <section className="timeline-section" ref={containerRef}>
      <div className="timeline-header">
        <h2 className="timeline-section-title">our journey</h2>
        <p className="timeline-section-subtitle">
          every moment that led us here
        </p>
      </div>

      <div className="timeline-container">
        {/* The vertical spine */}
        <div className="timeline-spine">
          <motion.div
            className="timeline-spine-fill"
            style={{ height: spineHeight }}
          />
        </div>

        {/* Chapter items */}
        {chapters.map((chapter, i) => (
          <TimelineItem key={chapter.id} chapter={chapter} index={i} />
        ))}
      </div>
    </section>
  );
}
