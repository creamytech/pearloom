'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Mail,
  LayoutGrid,
  Plane,
  TimerReset,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { colors as C, sectionPadding, layout } from '@/lib/design-tokens';

const FEATURES = [
  { icon: Mail, title: 'RSVP', accent: C.olive },
  { icon: LayoutGrid, title: 'Seating chart', accent: C.plum },
  { icon: Plane, title: 'Travel info', accent: C.gold },
  { icon: TimerReset, title: 'Time capsule', accent: C.olive },
  { icon: Bot, title: 'AI concierge', accent: C.plum },
  { icon: MessageSquare, title: 'Guestbook', accent: C.gold },
];

export function GuestExperience() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      ref={ref}
      id="features"
      style={{ background: C.cream, padding: `${sectionPadding.y} ${sectionPadding.x}` }}
    >
      <div
        className="flex flex-col lg:flex-row items-start gap-16"
        style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}
      >
        {/* Left — headline */}
        <motion.div
          className="lg:w-[38%] lg:pt-2"
          initial={{ opacity: 0, x: -20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <p
            className="font-body font-bold tracking-[0.18em] uppercase mb-4"
            style={{ fontSize: '0.72rem', color: C.olive }}
          >
            Guest Experience
          </p>
          <h2
            className="font-heading font-bold italic tracking-tight leading-[1.1]"
            style={{ fontSize: 'clamp(2rem,3.5vw,2.75rem)', color: C.ink }}
          >
            Everything they need.{' '}
            <span style={{ color: C.plum }}>Nothing they don&rsquo;t.</span>
          </h2>
        </motion.div>

        {/* Right — 2×3 icon grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-8">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.07 + 0.25, duration: 0.5 }}
              >
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${f.accent}18` }}
                >
                  <Icon size={16} style={{ color: f.accent }} />
                </div>
                <span
                  className="font-body font-semibold"
                  style={{ fontSize: '0.92rem', color: C.ink }}
                >
                  {f.title}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
