'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { C } from './colors';
import { text } from '@/lib/design-tokens';

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
        background: `linear-gradient(to right, ${C.deep}, rgba(255,255,255,0.3), ${C.deep})`,
        borderColor: C.divider,
        padding: 'clamp(2rem,4vw,3.5rem) 1.25rem',
      }}
    >
      <div className="max-w-[960px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center md:border-r md:last:border-r-0"
              style={{
                borderColor: C.divider,
              }}
            >
              <div
                className="font-[family-name:var(--eg-font-heading)] font-bold text-[1.8rem] leading-none mb-1.5"
                style={{ color: C.ink }}
              >
                {s.value}
              </div>
              <div
                className="font-semibold tracking-[0.12em] uppercase"
                style={{ fontSize: text.sm, color: C.muted }}
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
