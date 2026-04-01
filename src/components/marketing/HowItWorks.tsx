'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { colors as C, sectionPadding, layout } from '@/lib/design-tokens';

const STEPS = [
  { n: '01', title: 'Share your story', body: 'Upload photos, pick a vibe, describe your day.' },
  { n: '02', title: 'The Loom weaves it', body: 'Seven AI passes. One extraordinary site.' },
  { n: '03', title: 'Share and celebrate', body: 'Your link goes live. Beautiful, instantly.' },
];

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      ref={ref}
      id="how-it-works"
      style={{ background: C.cream, padding: `${sectionPadding.y} ${sectionPadding.x}` }}
    >
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="font-heading text-center font-bold italic tracking-tight mb-16"
          style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: C.ink }}
        >
          Live in minutes.
        </motion.h2>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x"
          style={{ borderColor: C.divider }}>
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15 + 0.2, duration: 0.6 }}
              className="flex flex-col px-8 py-10 md:first:pl-0 md:last:pr-0"
            >
              {/* Ghost number */}
              <span
                className="font-heading font-bold italic leading-none mb-6 select-none"
                style={{ fontSize: '5rem', color: C.divider }}
                aria-hidden
              >
                {s.n}
              </span>
              <h3
                className="font-heading font-semibold italic mb-3"
                style={{ fontSize: '1.25rem', color: C.ink }}
              >
                {s.title}
              </h3>
              <p
                className="font-body"
                style={{ fontSize: '0.95rem', color: C.muted, lineHeight: 1.7 }}
              >
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
