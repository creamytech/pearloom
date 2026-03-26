'use client';

// ─────────────────────────────────────────────────────────────
// everglow / components/timeline-item.tsx
// Intersection-observed, framer-motion animated chapter card
// ─────────────────────────────────────────────────────────────

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MapPin, Calendar } from 'lucide-react';
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
    offset: ['0 1', '1.1 1'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.3, 1]);
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    [isEven ? -60 : 60, 0]
  );
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);

  return (
    <motion.div
      ref={ref}
      className="timeline-item"
      style={{ opacity, x, scale }}
      data-side={isEven ? 'left' : 'right'}
    >
      {/* Connector dot on the timeline spine */}
      <div className="timeline-dot" />

      {/* Content card */}
      <div className={`timeline-card ${isEven ? 'card-left' : 'card-right'}`}>
        {/* Image */}
        {chapter.images.length > 0 && (
          <div className="timeline-image-wrap">
            <img
              src={chapter.images[0].url}
              alt={chapter.images[0].alt}
              className="timeline-image"
              loading="lazy"
            />
          </div>
        )}

        {/* Text content */}
        <div className="timeline-text">
          {/* Date pill */}
          <div className="timeline-meta">
            <span className="timeline-date-pill">
              <Calendar size={14} />
              {formatDate(chapter.date)}
            </span>
            {chapter.location && (
              <span className="timeline-location">
                <MapPin size={14} />
                {chapter.location.label}
              </span>
            )}
          </div>

          <h3 className="timeline-chapter-title">{chapter.title}</h3>
          {chapter.subtitle && (
            <p className="timeline-subtitle">{chapter.subtitle}</p>
          )}
          <p className="timeline-description">{chapter.description}</p>

          {chapter.mood && (
            <span className="timeline-mood">{chapter.mood}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
