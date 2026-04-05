'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { colors as C, sectionPadding, layout } from '@/lib/design-tokens';

const STEPS = [
  { n: '01', title: 'Curate your memories', body: 'Upload photos. The Loom groups them by shared soul.', accent: C.olive },
  { n: '02', title: 'The Loom weaves', body: 'Seven AI passes. Semantic anchoring to final polish.', accent: C.plum },
  { n: '03', title: 'Publish your legacy', body: 'Your digital atelier goes live — instantly.', accent: C.gold },
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
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <p className="text-[0.68rem] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: C.olive }}>
            3 steps · Under 2 minutes
          </p>
          <h2
            className="font-heading font-bold italic tracking-tight"
            style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: C.ink }}
          >
            Live in minutes.
          </h2>
        </motion.div>

        {/* 3-column grid with visual connections */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-[4.5rem] left-[16%] right-[16%] h-px" style={{ background: `linear-gradient(90deg, ${C.olive}40, ${C.plum}40, ${C.gold}40)` }} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.15 + 0.2, duration: 0.6 }}
                className="relative"
              >
                <motion.div
                  className="flex flex-col items-center text-center px-6 py-8 rounded-2xl bg-white border border-[var(--pl-divider)] cursor-default"
                  style={{ boxShadow: '0 2px 8px rgba(43,30,20,0.04)' }}
                  whileHover={{
                    y: -4,
                    boxShadow: '0 8px 32px rgba(43,30,20,0.08)',
                    transition: { duration: 0.2 },
                  }}
                >
                  {/* Number badge */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4 font-heading font-bold text-[1.1rem]"
                    style={{ background: `${s.accent}15`, color: s.accent, border: `1.5px solid ${s.accent}30` }}
                  >
                    {s.n}
                  </div>
                  <h3
                    className="font-heading font-semibold italic mb-2"
                    style={{ fontSize: '1.2rem', color: C.ink }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="font-body"
                    style={{ fontSize: '0.9rem', color: C.muted, lineHeight: 1.6 }}
                  >
                    {s.body}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
