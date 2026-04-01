'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { colors as C, text, sectionPadding, layout } from '@/lib/design-tokens';

const PASSES = [
  'Face Detection',
  'Scene Understanding',
  'Emotional Mapping',
  'Narrative Threading',
  'Moment Ranking',
  'Event DNA',
  'Timeline Weaving',
];

const RINDS = [
  {
    name: 'Garden Party',
    palette: [C.plum, C.gold, C.olive, C.cream, C.muted],
    font: 'Playfair Display',
  },
  {
    name: 'Modern Minimalist',
    palette: [C.ink, C.cream, C.muted, C.gold, C.divider],
    font: 'Inter',
  },
  {
    name: 'Coastal Breeze',
    palette: [C.olive, C.cream, C.gold, C.plum, C.muted],
    font: 'Lora',
  },
];

export function TheLoomShowcase() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.08 });

  return (
    <section
      ref={ref}
      id="the-loom"
      className="relative overflow-hidden"
      style={{
        background: C.darkBg,
        padding: `${sectionPadding.y} ${sectionPadding.x}`,
      }}
    >
      <div
        className="relative flex flex-col items-center text-center"
        style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}
      >
        {/* Section pill */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="font-body font-bold tracking-[0.18em] uppercase mb-4"
          style={{ fontSize: '0.72rem', color: C.plum }}
        >
          The Loom
        </motion.p>

        {/* Big headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, delay: 0.08 }}
          className="font-heading font-bold italic tracking-tight leading-[1.05] mb-6"
          style={{ fontSize: 'clamp(2.2rem,5vw,3.75rem)', color: C.darkHeading }}
        >
          Not assembled.{' '}
          <span style={{ color: C.plum }}>Woven.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.18 }}
          className="font-body max-w-[460px] mb-16"
          style={{ fontSize: text.md, color: C.darkText, lineHeight: 1.75 }}
        >
          Seven AI passes read your photos, understand your vibe, and thread together a site that&rsquo;s unmistakably yours.
        </motion.p>

        {/* 7 passes — pill row */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-20"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {PASSES.map((p, i) => (
            <motion.span
              key={p}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.06 + 0.35, duration: 0.35 }}
              className="font-body font-medium px-4 py-1.5 rounded-full"
              style={{
                fontSize: '0.82rem',
                background: `${C.olive}1A`,
                color: C.olive,
                border: `1px solid ${C.olive}33`,
              }}
            >
              Pass {i + 1} · {p}
            </motion.span>
          ))}
        </motion.div>

        {/* Rind divider */}
        <div
          className="w-full h-px mb-14"
          style={{ background: C.darkBorder }}
        />

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="font-body font-bold tracking-[0.18em] uppercase mb-3"
          style={{ fontSize: '0.72rem', color: C.plum }}
        >
          Rind™ — your visual identity
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.68, duration: 0.6 }}
          className="font-body max-w-[380px] mb-10"
          style={{ fontSize: text.sm, color: C.darkText, lineHeight: 1.7 }}
        >
          Colors, typography, and atmosphere — generated from your story.
        </motion.p>

        {/* Rind swatches — 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-[640px]">
          {RINDS.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.7 + i * 0.1, duration: 0.5 }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl"
              style={{
                background: C.darkCard,
                border: `1px solid ${C.darkBorder}`,
              }}
            >
              <div className="flex gap-1.5">
                {r.palette.map((c, j) => (
                  <div
                    key={j}
                    className="w-7 h-7 rounded-full"
                    style={{ background: c, border: `1px solid ${C.darkBorder}` }}
                  />
                ))}
              </div>
              <p
                className="font-body font-semibold"
                style={{ fontSize: '0.78rem', color: C.darkHeading }}
              >
                {r.name}
              </p>
              <p
                className="italic"
                style={{ fontSize: '0.75rem', color: C.darkText, fontFamily: r.font }}
              >
                {r.font}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
