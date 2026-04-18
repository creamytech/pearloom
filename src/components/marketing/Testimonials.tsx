'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/Testimonials.tsx
// Testimonial cards with avatar, quote, and attribution
// Matches Stitch "Echoes of Appreciation" section
// ─────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { sectionPadding, layout } from '@/lib/design-tokens';
import { SectionHeader } from './SectionHeader';

const TESTIMONIALS = [
  {
    quote: 'Pearloom has given my family\'s history a dignity it never had in dusty photo albums. It is breathing life into our past.',
    name: 'Sarah M.',
    role: 'Wedding, June 2025',
    avatar: null,
  },
  {
    quote: 'The Loom AI is uncanny. It curated my wedding archive in a way that felt like a professional editorial spread.',
    name: 'James & Priya',
    role: 'Anniversary celebration',
    avatar: null,
  },
  {
    quote: 'I created our engagement site in under 5 minutes. The AI picked our best photos and wrote our story better than we could.',
    name: 'Elena K.',
    role: 'Engagement, March 2025',
    avatar: null,
  },
];

function TestimonialCard({
  quote,
  name,
  role,
  index,
  inView,
}: {
  quote: string;
  name: string;
  role: string;
  index: number;
  inView: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      whileHover={{ y: -4 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      transition={{ delay: index * 0.12 + 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{
        padding: '2rem',
        borderRadius: 'var(--pl-radius-lg)',
        background: 'white',
        border: '1px solid var(--pl-divider)',
        boxShadow: hovered
          ? '0 20px 44px -14px color-mix(in oklab, var(--pl-pearl-c) 50%, transparent), 0 0 0 1px color-mix(in oklab, var(--pl-bruise) 18%, transparent)'
          : '0 1px 4px rgba(43,30,20,0.03)',
        position: 'relative',
        transition: 'box-shadow 380ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* Quote mark — becomes a pearl medallion on hover. */}
        <div
          className={hovered ? 'pl-pearl-accent' : undefined}
          style={{
            position: 'absolute', top: '-8px', left: '20px',
            width: '28px', height: '28px', borderRadius: '50%',
            background: hovered ? undefined : 'var(--pl-olive-mist)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem',
            color: hovered ? undefined : 'var(--pl-olive-deep)',
            fontFamily: 'var(--pl-font-heading)',
            fontWeight: 700,
            transition: 'background 220ms ease, color 220ms ease',
          }}
        >
          &ldquo;
        </div>

        {/* Quote text */}
        <p style={{
          fontSize: '0.95rem',
          fontFamily: 'var(--pl-font-heading)',
          fontStyle: 'italic',
          color: 'var(--pl-ink-soft)',
          lineHeight: 1.7,
          margin: '0 0 1.25rem',
        }}>
          &ldquo;{quote}&rdquo;
        </p>

        {/* Attribution */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          {/* Avatar circle */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--pl-cream-deep)',
            border: '2px solid var(--pl-divider)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.82rem', fontWeight: 700,
            color: 'var(--pl-muted)',
            fontFamily: 'var(--pl-font-heading)',
          }}>
            {name.charAt(0)}
          </div>
          <div>
            <p style={{
              fontSize: '0.82rem', fontWeight: 600,
              color: 'var(--pl-ink)',
              margin: 0, lineHeight: 1.3,
            }}>
              {name}
            </p>
            <p style={{
              fontSize: '0.68rem',
              color: 'var(--pl-muted)',
              margin: 0,
            }}>
              {role}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      style={{
        background: 'var(--pl-cream)',
        padding: `${sectionPadding.y} ${sectionPadding.x}`,
      }}
    >
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="Testimonials"
          title={<>What our creators are saying</>}
          subtitle="Real stories from couples and families who brought their celebrations to life with Pearloom."
          inView={inView}
          align="left"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard
              key={t.name}
              quote={t.quote}
              name={t.name}
              role={t.role}
              index={i}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
