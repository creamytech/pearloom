'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const C = {
  deep: '#EEE8DC',
  ink: '#2B2B2B',
  muted: '#9A9488',
  divider: '#E6DFD2',
  olive: '#A3B18A',
  gold: '#D6C6A8',
} as const;

const STATS = [
  { value: '2,000+', label: 'Sites Created' },
  { value: '50,000+', label: 'Photos Woven' },
  { value: '4.9/5', label: 'Creator Rating' },
  { value: '5 min', label: 'Average Build Time' },
];

export function SocialProofBar() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      ref={ref}
      className="border-y"
      style={{
        background: C.deep,
        borderColor: C.divider,
        padding: '3.5rem 1.5rem',
      }}
    >
      <div className="max-w-[960px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div
                className="font-[family-name:var(--eg-font-heading)] font-bold text-[1.8rem] leading-none mb-1.5"
                style={{ color: C.ink }}
              >
                {s.value}
              </div>
              <div
                className="text-[0.72rem] font-semibold tracking-[0.12em] uppercase"
                style={{ color: C.muted }}
              >
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
